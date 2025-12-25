/// <reference types="cypress" />

describe('CV Processing Real-time Update', () => {
  beforeEach(() => {
    // Login as a standard user
    cy.loginViaAPI('admin@techcorp.com', 'Admin123!');
    cy.visit('/pipeline');
  });

  it('should show processing indicator and then update the card in real-time', () => {
    // 1. Mock the initial state (CV is processing)
    cy.intercept('/api/profiles/?page=1&limit=50&sort_by=newest', (req) => {
      req.reply((res) => {
        const processingCv = {
          id: 999,
          is_parsed: false,
          parsed_data: {},
          uploaded_at: new Date().toISOString(),
        };
        res.body.items.unshift(processingCv);
        res.body.total += 1;
        res.send(res.body);
      });
    }).as('getProfiles');

    // Variable to capture the mock WebSocket
    let mockWs;

    // 2. Visit the page with WebSocket stub
    cy.visit('/pipeline', {
      onBeforeLoad: (win) => {
        const OriginalWebSocket = win.WebSocket;
        win.WebSocket = function(url, protocols) {
          // Check if this is the sync WebSocket
          if (url.includes('/api/sync/ws/sync')) {
             mockWs = {
               close: () => {},
               send: () => {},
               readyState: 1, // OPEN
               // Properties expected by the app
               onopen: null,
               onmessage: null,
               onerror: null,
               onclose: null,
               addEventListener: () => {},
               removeEventListener: () => {},
             };
             // Simulate connection open
             setTimeout(() => { if (mockWs.onopen) mockWs.onopen(); }, 100);
             return mockWs;
          }
          // Pass through other sockets if any (e.g. Vite HMR)
          return new OriginalWebSocket(url, protocols); 
        };
        // Copy static constants if needed (CONNECTING, OPEN, etc.)
        win.WebSocket.CONNECTING = 0;
        win.WebSocket.OPEN = 1;
        win.WebSocket.CLOSING = 2;
        win.WebSocket.CLOSED = 3;
      }
    });
    
    cy.wait('@getProfiles');

    // 3. Assert that the processing indicator is visible
    cy.get('[data-cy-cv-id="999"] .animate-spin').should('be.visible');

    // 4. Prepare for the update
    cy.intercept('/api/profiles/?page=1&limit=50&sort_by=newest', (req) => {
      req.reply((res) => {
        const parsedCv = {
          id: 999,
          is_parsed: true,
          parsed_data: { name: 'John Doe' },
          uploaded_at: new Date().toISOString(),
        };
        res.body.items.unshift(parsedCv);
        res.send(res.body);
      });
    }).as('getUpdatedProfiles');

    // 5. Simulate WebSocket message to trigger update
    cy.then(() => {
        expect(mockWs).to.exist;
        expect(mockWs.onmessage).to.be.a('function');
        
        mockWs.onmessage({
            data: JSON.stringify({
                type: 'update',
                cv_finished: [999]
            })
        });
    });

    // 6. Wait for the re-fetch
    cy.wait('@getUpdatedProfiles');

    // 7. Assert that the processing indicator is gone and the name is visible
    cy.get('[data-cy-cv-id="999"] .animate-spin').should('not.exist');
    cy.get('[data-cy-cv-id="999"]').should('contain', 'John Doe');
  });
});
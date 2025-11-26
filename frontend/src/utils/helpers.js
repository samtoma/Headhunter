export const safeList = (data) => {
    if (data === undefined || data === null) return []
    if (Array.isArray(data)) return data
    try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) { return [data] }
}

export const parseSalary = (str) => {
    if (!str) return 0
    const match = str.toLowerCase().match(/(\d+(\.\d+)?)\s*k?/)
    if (!match) return 0
    let val = parseFloat(match[1])
    if (str.toLowerCase().includes('k')) val *= 1000
    return val
}

export const formatCurrency = (val) => {
    if (!val) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val).replace('USD', '$')
}

export const getStatusColor = (status) => {
    switch (status) {
        case "Hired": return "bg-emerald-100 text-emerald-700 border-emerald-200"
        case "Rejected": return "bg-red-100 text-red-700 border-red-200"
        case "Silver Medalist": return "bg-indigo-100 text-indigo-700 border-indigo-200"
        default: return "bg-slate-100 text-slate-500 border-slate-200"
    }
}

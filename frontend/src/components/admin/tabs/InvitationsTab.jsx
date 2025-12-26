
import { getStatusColor, formatDate } from '../utils/adminDashboardUtils'

const InvitationsTab = ({ invitations }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Invited By</th>
                        <th className="p-4">Sent At</th>
                        <th className="p-4">Expires At</th>
                        <th className="p-4">Accepted At</th>
                        <th className="p-4">Email Error</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-medium text-slate-900">{inv.email}</td>
                            <td className="p-4 text-slate-600">{inv.role}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(inv.status)}`}>
                                    {inv.status}
                                </span>
                            </td>
                            <td className="p-4 text-slate-500 text-xs">{inv.invited_by_email || "-"}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.sent_at)}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.expires_at)}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.accepted_at) || "-"}</td>
                            <td className="p-4 text-red-600 text-xs">{inv.email_error || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default InvitationsTab

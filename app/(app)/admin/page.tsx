import { AdminPanel } from '@/components/admin/AdminPanel';
import { UserManagement } from '@/components/admin/UserManagement';

export default function AdminPage() {
    return (
        <section style={{ padding: '2rem' }}>
            <AdminPanel />
            <UserManagement />
        </section>
    );
}

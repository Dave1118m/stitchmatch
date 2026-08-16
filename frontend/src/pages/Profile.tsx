import { useAuth } from '../context/AuthContext';
import CustomerProfileSettings from './profile/CustomerProfileSettings';
import TailorProfileSettings from './profile/TailorProfileSettings';

export default function Profile() {
  const { user } = useAuth();
  
  if (!user) return null;

  return user.role === 'tailor' ? <TailorProfileSettings /> : <CustomerProfileSettings />;
}
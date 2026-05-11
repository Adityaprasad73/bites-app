import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Restaurant from './pages/Restaurant.jsx';
import Cart from './pages/Cart.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import OrderTrack from './pages/OrderTrack.jsx';
import MyOrders from './pages/MyOrders.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import DeliveryDashboard from './pages/DeliveryDashboard.jsx';
import Profile from './pages/Profile.jsx';
import CreateRestaurant from './pages/CreateRestaurant.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-65px)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurant/:id" element={<Restaurant />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/order/:id" element={<ProtectedRoute><OrderTrack /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute roles={['customer']}><MyOrders /></ProtectedRoute>} />
          <Route path="/owner" element={<ProtectedRoute roles={['restaurant_owner', 'admin']}><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/new-restaurant" element={<ProtectedRoute roles={['restaurant_owner', 'admin']}><CreateRestaurant /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute roles={['delivery_partner', 'admin']}><DeliveryDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
        </Routes>
      </main>
      <BottomNav />
      <footer className="hidden md:block border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        Bites — a food delivery MVP. Built with ❤️
      </footer>
    </>
  );
}

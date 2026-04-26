import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RegisterModal from './components/RegisterModal'
import Login from './components/Login'

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_team: string;
  status: string;
}

const HealthPulse = ({ status }: { status: 'loading' | 'up' | 'down' }) => {
  const color = status === 'up' ? 'bg-green-500' : status === 'down' ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className="relative flex items-center justify-center w-3 h-3 mr-3">
      <motion.span
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
      ></motion.span>
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`}></span>
    </div>
  );
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  
  const [services, setServices] = useState<Service[]>([]);
  const [healthStatus, setHealthStatus] = useState<Record<string, 'loading' | 'up' | 'down'>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const API_URL = 'http://192.168.29.100:4000/api/services';

  const handleLoginSuccess = (newToken: string, loggedInUser: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', loggedInUser);
    setToken(newToken);
    setUsername(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setServices([]);
  };

  const fetchServices = useCallback(() => {
    if (!token) return; // Don't fetch if not logged in

    setLoading(true);
    setFetchError(null);

    // We must pass the token in the headers so the backend knows we are authorized!
    fetch(API_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
           handleLogout(); // Token expired or invalid, kick them out
           throw new Error("Session expired. Please log in again.");
        }
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setServices(data);
          data.forEach((s: Service) => checkServiceHealth(s.slug));
        } else {
          setServices([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message);
        setLoading(false);
        setServices([]);
      });
  }, [token]);

  const checkServiceHealth = async (slug: string) => {
    setHealthStatus(prev => ({ ...prev, [slug]: 'loading' }));
    try {
      const res = await fetch(`http://192.168.29.100:4000/api/${slug.split('-')[0]}/health`);
      setHealthStatus(prev => ({ ...prev, [slug]: res.ok ? 'up' : 'down' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, [slug]: 'down' }));
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(() => {
      if (Array.isArray(services) && token) {
        services.forEach(s => checkServiceHealth(s.slug));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchServices, services.length, token]);

  // If no token exists, lock them out and show the Login screen!
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If they have a token, show the Dashboard!
  return (
    <div className="min-h-screen p-8 md:p-24 flex flex-col items-center">
      <RegisterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); fetchServices(); }}
      />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl w-full mb-16 relative">
        {/* Logout Button */}
        <div className="absolute top-0 right-0 flex items-center gap-4">
          <span className="text-slate-500 text-sm font-mono">OP: {username?.toUpperCase()}</span>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            [ LOGOUT ]
          </button>
        </div>

        <div className="text-center pt-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tight">ReleasePilot</h1>
          <p className="text-xl text-slate-400">System Monitoring & Infrastructure Management</p>
        </div>
      </motion.div>

      <div className="max-w-5xl w-full">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-semibold">Live Fleet</h2>
          <button onClick={() => setIsModalOpen(true)} className="glass-button text-sm font-medium">+ Register</button>
        </div>

        {Array.isArray(services) && services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  className="glass-panel p-8 group relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <HealthPulse status={healthStatus[service.slug] || 'loading'} />
                      <h3 className="text-xl font-medium text-white">{service.name}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border ${
                      healthStatus[service.slug] === 'up' ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'
                    }`}>
                      {healthStatus[service.slug]?.toUpperCase() || 'CHECKING'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-1">{service.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>TEAM: {service.owner_team.toUpperCase()}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">ID: {service.id.slice(0, 8)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : loading ? (
          <div className="glass-panel p-20 text-center animate-pulse text-slate-500">
            Scanning cluster for active services...
          </div>
        ) : (
          <div className="glass-panel p-20 text-center border-red-500/20 bg-red-500/5">
            <div className="text-red-400 font-medium mb-2">Communication Link Severed</div>
            <p className="text-slate-500 text-sm mb-6">
              {fetchError || "The database returned an invalid response. Check backend logs."}
            </p>
            <button
              onClick={fetchServices}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs transition-all"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

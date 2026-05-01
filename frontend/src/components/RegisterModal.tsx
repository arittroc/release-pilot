import { useState } from 'react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    owner_team: '',
    repo_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://api.releasepilot.local/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to register service');
      
      onSuccess(); // Triggers the dashboard to refresh
      onClose();   // Closes the modal
    } catch (err) {
      setError('Registration failed. Check cluster connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="glass-panel w-full max-w-lg p-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        <h2 className="text-2xl font-semibold mb-6">Register New Service</h2>
        
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Service Name</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="e.g. User Profile API"
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Slug</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="e.g. user-profile-api"
                onChange={e => setFormData({...formData, slug: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Description</label>
            <input 
              required
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="Briefly describe what this service does"
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Owner Team</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="e.g. frontend-team"
                onChange={e => setFormData({...formData, owner_team: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">GitHub Repo URL</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="github.com/org/repo"
                onChange={e => setFormData({...formData, repo_url: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="glass-button text-sm font-medium disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? 'Deploying...' : 'Register Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

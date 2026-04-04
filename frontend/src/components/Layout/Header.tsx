import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useHasSetUsername, useUsername } from '@/hooks/useContract';
import UsernameModal from '@/components/ui/UsernameModal';

const Header = () => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  const isHome = location.pathname === '/';

  const { data: hasSetUsername, refetch: refetchHasSetUsername } = useHasSetUsername(address || '');
  const { data: username, refetch: refetchUsername } = useUsername(address || '');

  const navItems = [
    { path: '/gallery', label: '展厅' },
    { path: '/create', label: '创建' },
    ...(isConnected ? [{ path: '/me', label: '我的记录' }] : []),
  ];

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      const injected = connectors.find(c => c.name === 'Injected');
      if (injected) {
        connect({ connector: injected });
      }
    }
  };

  const displayName = isConnected ? (username && username.trim() ? username.trim() : '云吃吃') : null;

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isHome
            ? 'bg-gradient-to-r from-violet-900/90 via-purple-900/80 to-fuchsia-900/80 backdrop-blur-md border-white/10'
            : 'bg-background/80 backdrop-blur-md border-border'
        }`}
      >
        <div className="gallery-container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className={`text-xl font-bold ${isHome ? 'text-violet-300' : 'text-foreground'}`}>
              ✿
            </span>
            <span className={`text-lg font-semibold tracking-tight ${isHome ? 'text-white' : 'text-foreground'}`}>
              HerGallery
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="relative px-4 py-2 text-sm font-medium transition-colors"
              >
                <span
                  className={
                    location.pathname === item.path
                      ? isHome ? 'text-violet-200' : 'text-foreground'
                      : isHome
                        ? 'text-white/70 hover:text-white'
                        : 'text-muted-foreground hover:text-foreground'
                  }
                >
                  {item.label}
                </span>
                {location.pathname === item.path && (
                  <motion.div
                    layoutId="nav-indicator"
                    className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${isHome ? 'bg-violet-400' : 'bg-foreground'}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            {isConnected ? (
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => setShowUsernameModal(true)}
                  className={`flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors cursor-pointer ${
                    isHome
                      ? 'border-white/25 text-white hover:bg-white/10'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  {displayName}
                </button>
                <button
                  onClick={handleWalletClick}
                  className={`flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors cursor-pointer ${
                    isHome
                      ? 'border-white/20 text-white/60 hover:bg-white/10'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                  title="断开钱包"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={handleWalletClick}
                className={`ml-4 flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors cursor-pointer ${
                  isHome
                    ? 'border-white/30 text-white hover:bg-white/15'
                    : 'border-border text-foreground hover:bg-secondary'
                }`}
              >
                连接钱包
              </button>
            )}
          </nav>
        </div>
      </header>

      <UsernameModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        onUsernameSet={() => {
          refetchUsername();
          refetchHasSetUsername();
        }}
      />
    </>
  );
};

export default Header;

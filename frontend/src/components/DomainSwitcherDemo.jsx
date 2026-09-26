import React from 'react';
import { Globe } from 'lucide-react';

export default function DomainSwitcherDemo() {
  const currentHost = window.location.host;
  const currentPort = window.location.port ? `:${window.location.port}` : '';

  const domains = [
    { label: 'ABC Electronics (ID: 101)', host: `abc.localhost${currentPort}` },
    { label: 'XYZ Furniture (ID: 102)', host: `xyz.localhost${currentPort}` },
    { label: 'Platform Admin', host: `prod.localhost${currentPort}` },
    { label: 'Unknown Domain (Test 404)', host: `unknown.localhost${currentPort}` },
  ];

  const handleSwitch = (targetHost) => {
    const protocol = window.location.protocol;
    window.location.href = `${protocol}//${targetHost}/`;
  };

  return (
    <div className="domain-switcher-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600 }}>
        <Globe size={14} color="#60A5FA" />
        <span>SWITCH DOMAIN:</span>
      </div>
      {domains.map((item) => {
        const isActive = currentHost.toLowerCase() === item.host.toLowerCase();
        return (
          <button
            key={item.host}
            onClick={() => handleSwitch(item.host)}
            className={`domain-pill ${isActive ? 'active' : ''}`}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: '21b3dc02-26c2-4315-b3ba-e17d4f8f3135',
    authority: 'https://login.microsoftonline.com/fa888f92-b951-4ea3-811a-097d54ef1994',
    redirectUri: "https://portal.jaydien.com",
  },
};
const msalInstance = new PublicClientApplication(msalConfig);

export default function App() {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [signedOut, setSignedOut] = useState(false);

  const [tenants, setTenants] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    const currentAccounts = msalInstance.getAllAccounts();
    const queryParams = new URLSearchParams(window.location.search);
    if (currentAccounts.length > 0) {
      setAccount(currentAccounts[0]);
    } else if (queryParams.get('postLogout') === 'true') {
      setSignedOut(true);
    }

    fetch('https://jaydienscripts-bna3czfmawgrfhh2.eastus-01.azurewebsites.net/api/tenants')
      .then(res => res.json())
      .then(setTenants);

    fetch('https://jaydienscripts-bna3czfmawgrfhh2.eastus-01.azurewebsites.net/api/scripts')
      .then(res => res.json())
      .then(setScripts);
  }, []);

  useEffect(() => {
    if (!selectedTenant) {
      setUsers([]);
      setSelectedUser('');
      return;
    }

    fetch(`https://jaydienscripts-bna3czfmawgrfhh2.eastus-01.azurewebsites.net/api/tenant-users?tenantId=${selectedTenant}`)
      .then(res => res.json())
      .then(setUsers)
      .catch(err => {
        console.error('Failed to fetch users', err);
        setUsers([]);
      });
  }, [selectedTenant]);

  const signIn = async () => {
    try {
      const result = await msalInstance.loginPopup({ scopes: ['User.Read'] });
      setAccount(result.account);
      setSignedOut(false);
    } catch (err) {
      console.error(err);
    }
  };

  const signOut = () => {
    msalInstance.logoutRedirect();
  };

  const runScript = async () => {
    if (!selectedTenant || !selectedScript) {
      setOutput('⚠️ Please select both tenant and script.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('https://jaydienscripts-bna3czfmawgrfhh2.eastus-01.azurewebsites.net/api/run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptName: selectedScript,
          tenantId: selectedTenant,
          params: {
            ...(selectedUser && { UserPrincipalName: selectedUser })
          }
        }),
      });

      const data = await res.text();
      setOutput(data);
    } catch (err) {
      setOutput('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-700">Jaydien Script Runner</h1>
          {account && (
            <div className="text-sm text-right">
              <p className="text-gray-600">👤 {account.username}</p>
              <button onClick={signOut} className="text-red-500 hover:underline text-xs mt-1">Sign Out</button>
            </div>
          )}
        </div>

        {signedOut && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
            👋 You’ve been signed out.
          </div>
        )}

        {!account ? (
          <div className="text-center">
            <p className="mb-2">🔒 Please sign in to run scripts.</p>
            <button onClick={signIn} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Select Tenant</label>
                <select
                  value={selectedTenant}
                  onChange={e => setSelectedTenant(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Choose a Tenant --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {users.length > 0 && (
                <div>
                  <label className="block mb-1 font-medium">Select User</label>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Optional: Choose a User --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1 font-medium">Select Script</label>
                <select
                  value={selectedScript}
                  onChange={e => setSelectedScript(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Choose a Script --</option>
                  {scripts.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="text-center">
                <button
                  onClick={runScript}
                  disabled={loading || !selectedScript || !selectedTenant}
                  className="bg-green-600 text-white px-5 py-2 rounded-full hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Running...' : '🚀 Run Script'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <label className="block font-semibold mb-1">Output</label>
              <pre className="bg-black text-green-400 text-sm p-4 rounded-lg overflow-x-auto whitespace-pre-wrap min-h-[100px]">
                {output || '📭 No output yet.'}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
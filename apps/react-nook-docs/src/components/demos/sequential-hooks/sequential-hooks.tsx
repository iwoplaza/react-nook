// biome-ignore assist/source/organizeImports: better for docs
import { useState } from 'react';
import { Btn } from '../common';
import { nook } from 'react-nook';
import { useUserId, useUserProfile, useUserPermissions } from './hooks';

// ---cut-before---
// Turn hooks into nooks
const $userId = nook(useUserId);
const $userProfile = nook(useUserProfile);
const $userPermissions = nook(useUserPermissions);

// Regular React component using hooks - all hooks run regardless of conditions
const HooksVersion = () => {
  const [enabled, setEnabled] = useState(false);
  
  // All hooks run even when disabled - wasteful!
  const userId = useUserId(1000);
  const profile = useUserProfile(userId);
  const permissions = useUserPermissions(profile);

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Regular Hooks (Always Run)</h3>
      <Btn onClick={() => setEnabled(!enabled)} highlighted={enabled}>
        {enabled ? 'Disable' : 'Enable'}
      </Btn>
      {enabled && (
        <div className="mt-2 space-y-1 text-sm">
          <p>User ID: {userId || 'Loading...'}</p>
          <p>Profile: {profile ? profile.name : 'Loading...'}</p>
          <p>Permissions: {permissions ? permissions.join(', ') : 'Loading...'}</p>
        </div>
      )}
    </div>
  );
};

// Nook component - conditional execution based on previous results
const NooksVersion = nook(() => {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Nooks (Conditional Execution)</h3>
      <Btn onClick={() => setEnabled(!enabled)} highlighted={enabled}>
        {enabled ? 'Disable' : 'Enable'}
      </Btn>
      {enabled && (
        <div className="mt-2 space-y-1 text-sm">
          {/* Only call $userId when enabled */}
          <p>User ID: {$userId``(1000) || 'Loading...'}</p>
          
          {/* Only call $userProfile if we have a userId */}
          {$userId``(1000) && (
            <p>Profile: {$userProfile``($userId``(1000))?.name || 'Loading...'}</p>
          )}
          
          {/* Only call $userPermissions if we have a profile */}
          {$userId``(1000) && $userProfile``($userId``(1000)) && (
            <p>Permissions: {$userPermissions``($userProfile``($userId``(1000)))?.join(', ') || 'Loading...'}</p>
          )}
        </div>
      )}
    </div>
  );
});

const SequentialHooksDemo = () => {
  return (
    <div className="grid gap-4 max-w-2xl mx-auto m-8">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-2">Sequential Hooks vs Nooks</h2>
        <p className="text-sm text-gray-600">
          Compare how hooks always run vs nooks that only run when conditions are met
        </p>
      </div>
      <HooksVersion />
      <NooksVersion />
    </div>
  );
};

// ---cut-after---
export default SequentialHooksDemo;
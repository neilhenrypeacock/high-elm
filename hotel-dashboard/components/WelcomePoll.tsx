'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// The waiting half of /welcome. The page itself is a server component that
// redirects to /dashboard the moment the subscription row exists, so all this
// has to do is ask it to run again: router.refresh() re-renders the server
// component with fresh cookies, and the redirect fires on whichever attempt
// finds the row.
//
// It gives up after GIVE_UP_MS rather than spinning forever — at that point the
// webhook has almost certainly failed rather than lagged, and a member staring
// at a spinner deserves to be told what to do next.
const POLL_MS = 2000;
const GIVE_UP_MS = 30000;

export default function WelcomePoll() {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const poll = setInterval(() => router.refresh(), POLL_MS);
    const giveUp = setTimeout(() => {
      clearInterval(poll);
      setGaveUp(true);
    }, GIVE_UP_MS);

    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
    };
  }, [router]);

  if (gaveUp) {
    return (
      <p style={{ fontSize: 13, color: 'var(--body-mid)', lineHeight: 1.7, margin: '20px 0 0' }}>
        This is taking longer than it should. Your payment is safe &mdash; nothing was
        charged twice. Email{' '}
        <a href="mailto:neil@highelmstudio.com" className="cr-link" style={{ color: 'var(--signal-deep)' }}>
          neil@highelmstudio.com
        </a>{' '}
        and we&rsquo;ll sort it out today.
      </p>
    );
  }

  return (
    <p
      aria-live="polite"
      style={{ fontSize: 13, color: 'var(--body-mid)', lineHeight: 1.7, margin: '20px 0 0' }}
    >
      Waiting for confirmation…
    </p>
  );
}

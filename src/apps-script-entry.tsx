import { createRoot } from 'react-dom/client';
import Page from './app/page';
import PrivacyPage from './app/privacy/page';
import { appUrl } from './lib/apps-script';
const root = document.getElementById('root');
if (root) {
  const privacy = root.dataset.page === 'privacy';
  createRoot(root).render(privacy ? <PrivacyPage /> : <Page />);
  if (privacy) setTimeout(() => {
    const back = root.querySelector<HTMLAnchorElement>('a[href="../"]');
    if (back) { back.href = appUrl(); back.target = '_top'; }
  }, 0);
}

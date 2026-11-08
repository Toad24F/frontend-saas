import { mailResultsHtml } from './mail-history.js';

export const workspaceState = { tab: 'general', mail: { status: '', type: '', page: 1 } };

export function bindBusinessWorkspace(getSnapshot, refresh) {
  function selectTab(root, id, focus = false) {
    workspaceState.tab = id;
    root.querySelectorAll('[data-business-tab]').forEach((tab) => {
      const selected = tab.dataset.businessTab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-selected', selected);
      if (selected && focus) { tab.focus(); tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    });
    root.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `business-panel-${id}`; });
  }
  function update(root, focus = false) {
    const results = root.querySelector('[data-mail-results]');
    results.innerHTML = mailResultsHtml(getSnapshot().deliveries, workspaceState.mail);
    if (focus) { results.tabIndex = -1; results.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', async (event) => {
    const root = event.target.closest('.business-workspace');
    if (!root || !getSnapshot()) return;
    const tab = event.target.closest('[data-business-tab]');
    if (tab) return selectTab(root, tab.dataset.businessTab);
    const page = event.target.closest('[data-mail-page]');
    if (page) { workspaceState.mail.page = Number(page.dataset.mailPage); update(root, true); }
    if (event.target.closest('[data-mail-clear]')) {
      workspaceState.mail = { status: '', type: '', page: 1 };
      root.querySelectorAll('[data-mail-filter]').forEach((select) => { select.value = ''; });
      update(root);
      root.querySelector('[data-mail-filter]').focus();
    }
    const refreshButton = event.target.closest('[data-mail-refresh]');
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Actualizando…';
      await refresh();
      document.querySelector('.business-workspace [data-mail-refresh], [data-action="retry-business-detail"]')?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('change', (event) => {
    const root = event.target.closest('.business-workspace');
    const filter = event.target.closest('[data-mail-filter]');
    if (!root || !filter || !getSnapshot()) return;
    workspaceState.mail[filter.dataset.mailFilter] = filter.value;
    workspaceState.mail.page = 1;
    update(root);
  });
  document.addEventListener('keydown', (event) => {
    const tab = event.target.closest('[data-business-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const root = tab.closest('.business-workspace');
    const tabs = [...root.querySelectorAll('[data-business-tab]')];
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(root, tabs[next].dataset.businessTab, true);
  });
}

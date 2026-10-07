// Clicking the toolbar button opens the planner in a tab (or focuses it if already open).
browser.action.onClicked.addListener(async () => {
  const url = browser.runtime.getURL("src/planner.html");
  const existing = await browser.tabs.query({ url });
  if (existing.length) {
    await browser.tabs.update(existing[0].id, { active: true });
    await browser.windows.update(existing[0].windowId, { focused: true });
  } else {
    await browser.tabs.create({ url });
  }
});

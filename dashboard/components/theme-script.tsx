export function ThemeScript() {
  const script = `
    (() => {
      const saved = localStorage.getItem("dashboard-theme");
      const theme = saved || "dark";
      document.documentElement.dataset.theme = theme;
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}

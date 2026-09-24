export default function SafeArea({ children, top = false, bottom = false }) {
  const classes = [top && 'safe-top', bottom && 'safe-bottom'].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
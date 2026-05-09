export default function Badge({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-1 bg-neutral-900 tracking-wide rounded-lg py-0.5 px-2 ${className}`}
    >
      <span className="text-xs text-neutral-400">{text}</span>
    </div>
  );
}

export default function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-gray-200/60">
      <div className="px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900 text-center">{title}</h1>
      </div>
    </header>
  )
}

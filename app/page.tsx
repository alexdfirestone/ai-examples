import Link from 'next/link';

export default function Page() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-6xl font-mono font-bold text-black mb-4 tracking-tight">
          AI Examples
        </h1>
        
        <div className="h-px bg-black mb-12 mt-8"></div>
        
        <nav className="space-y-6">
          <Link 
            href="/workflows"
            className="block group"
          >
            <div className="border-2 border-black p-8 hover:bg-black hover:text-white transition-all duration-200">
              <h2 className="text-3xl font-mono font-semibold mb-2">
                Workflows
              </h2>
              <p className="font-mono text-sm opacity-70">
                Multi-step AI workflows with human-in-the-loop approval
              </p>
            </div>
          </Link>
          
          <Link 
            href="/basic-chat"
            className="block group"
          >
            <div className="border-2 border-black p-8 hover:bg-black hover:text-white transition-all duration-200">
              <h2 className="text-3xl font-mono font-semibold mb-2">
                Basic Chat
              </h2>
              <p className="font-mono text-sm opacity-70">
                Simple AI chat interface with streaming responses
              </p>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
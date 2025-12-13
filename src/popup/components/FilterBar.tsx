interface FilterBarProps {
  url: string;
  setUrl: (url: string) => void;
  clear: () => void;
}

export function FilterBar({ url, setUrl, clear }: FilterBarProps) {
  return (
    <div className="relative mt-4">
      <input
        value={url}
        onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
        placeholder="Target URL"
        aria-label="Target URL"
        className="w-full pr-10 border rounded px-2 py-1"
      />
      {url && (
        <button
          onClick={() => clear()}
          className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
          aria-label="Clear URL"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

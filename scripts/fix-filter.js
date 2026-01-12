const fs = require("fs");
const path = "G:/Projects/NextUp/src/app/me/page.tsx";
let content = fs.readFileSync(path, "utf8");

// Add import
content = content.replace(
  'import { useSession } from "next-auth/react"',
  'import { useSession } from "next-auth/react"\nimport { useSearchParams } from "next/navigation"'
);

// Add searchParams hook
content = content.replace(
  "const { data: session, status: sessionStatus } = useSession()",
  "const { data: session, status: sessionStatus } = useSession()\n  const searchParams = useSearchParams()"
);

// Add useEffect for URL params
content = content.replace(
  'const [successMessage, setSuccessMessage] = useState("")',
  'const [successMessage, setSuccessMessage] = useState("")\n\n  // Initialize filter from URL params\n  useEffect(() => {\n    const statusParam = searchParams.get("status")\n    if (statusParam && FILTER_OPTIONS.some(opt => opt.value === statusParam)) {\n      setFilter(statusParam)\n    }\n  }, [searchParams])'
);

fs.writeFileSync(path, content);
console.log("File updated successfully");

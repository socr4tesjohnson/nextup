const fs = require('fs');
let content = fs.readFileSync('G:/Projects/NextUp/gamepage_backup.tsx', 'utf8');

// Add video modal state
content = content.replace(
  'const [addSuccess, setAddSuccess] = useState("")\n\n  // Handle Escape key to close modal',
  'const [addSuccess, setAddSuccess] = useState("")\n\n  // Video modal state\n  const [selectedVideo, setSelectedVideo] = useState(null)\n\n  // Handle Escape key to close modals'
);

// Update escape handler
content = content.replace(
  'if (e.key === "Escape" && showAddModal) {\n        setShowAddModal(false)\n        setAddError("")\n      }',
  'if (e.key === "Escape") {\n        if (selectedVideo) {\n          setSelectedVideo(null)\n        } else if (showAddModal) {\n          setShowAddModal(false)\n          setAddError("")\n        }\n      }'
);

// Update useEffect dependencies
content = content.replace(
  '}, [showAddModal])',
  '}, [showAddModal, selectedVideo])'
);

fs.writeFileSync('G:/Projects/NextUp/gamepage_modified.tsx', content);
console.log('File modified successfully');

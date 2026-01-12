const fs = require('fs');
let content = fs.readFileSync('G:/Projects/NextUp/gamepage_final.tsx', 'utf8');

// Add video modal before the final </main>
const videoModal = `
        {/* Video Modal */}
        {selectedVideo && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                aria-label="Close video"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={\`https://www.youtube.com/embed/\${selectedVideo.youtubeId}?autoplay=1\`}
                  title={selectedVideo.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <p className="text-white text-center mt-3 text-lg font-medium">{selectedVideo.name}</p>
            </div>
          </div>
        )}
`;

// Insert before the closing </main> but after the Add to List Modal closing tags
content = content.replace(
  /        \}\)\n      <\/main>/,
  `        })\n${videoModal}      </main>`
);

fs.writeFileSync('G:/Projects/NextUp/gamepage_final2.tsx', content);
console.log('File modified successfully');

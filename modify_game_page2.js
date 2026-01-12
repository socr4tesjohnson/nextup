const fs = require('fs');
let content = fs.readFileSync('G:/Projects/NextUp/gamepage_modified.tsx', 'utf8');

// Fix type for selectedVideo
content = content.replace(
  'const [selectedVideo, setSelectedVideo] = useState(null)',
  'const [selectedVideo, setSelectedVideo] = useState<GameVideo | null>(null)'
);

// Replace the large embedded trailers with small thumbnail grid
const oldTrailersSection = `{/* Game Trailers Section */}
            {game.videos && game.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Trailers</h2>
                <div className="space-y-4">
                  {game.videos.map((video, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{video.name}</h3>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={\`https://www.youtube.com/embed/\${video.youtubeId}\`}
                          title={video.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}`;

const newTrailersSection = `{/* Game Trailers Section - Compact Thumbnails */}
            {game.videos && game.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Trailers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {game.videos.map((video, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedVideo(video)}
                      className="group relative aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 ring-primary transition-all focus:outline-none focus:ring-2"
                    >
                      <img
                        src={\`https://img.youtube.com/vi/\${video.youtubeId}/mqdefault.jpg\`}
                        alt={video.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs text-white line-clamp-2">{video.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}`;

content = content.replace(oldTrailersSection, newTrailersSection);

// Add video modal before the closing </main> tag
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
      </main>`;

content = content.replace('      </main>', videoModal);

fs.writeFileSync('G:/Projects/NextUp/gamepage_final.tsx', content);
console.log('File modified successfully');

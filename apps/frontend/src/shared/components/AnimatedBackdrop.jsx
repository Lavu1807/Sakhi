import { useEffect, useRef } from "react";
import gsap from "gsap";

const blobs = ["blob-a", "blob-b", "blob-c"];

export default function AnimatedBackdrop() {
  const rootRef = useRef(null);
  const blobRefs = useRef([]);

  useEffect(() => {
    if (!rootRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      blobRefs.current.forEach((blob, index) => {
        if (!blob) {
          return;
        }

        gsap.to(blob, {
          x: gsap.utils.random(-36, 36),
          y: gsap.utils.random(-24, 24),
          scale: gsap.utils.random(0.96, 1.06),
          rotate: gsap.utils.random(-8, 8),
          duration: gsap.utils.random(14, 20),
          delay: index * 0.3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
    }, rootRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <div className="app-backdrop" ref={rootRef} aria-hidden="true">
      <div className="radial-mesh" />
      {blobs.map((blobClass, index) => (
        <span
          key={blobClass}
          className={`aurora-blob ${blobClass}`}
          ref={(element) => {
            blobRefs.current[index] = element;
          }}
        />
      ))}
    </div>
  );
}

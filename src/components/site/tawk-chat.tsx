import Script from "next/script";

/** Tawk.to live chat; the ID comes from Admin → Settings (empty = no chat). */
export function TawkChat({ tawkId }: { tawkId: string }) {
  if (!/^[a-z0-9]+\/[a-z0-9]+$/i.test(tawkId)) return null;
  const src = `https://embed.tawk.to/${tawkId}`;
  return (
    <Script id="tawk-to" strategy="lazyOnload">
      {`
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        // Lift the chat bubble above the phone bottom bar / sticky buy bar.
        Tawk_API.customStyle = { visibility: { mobile: { position: "br", xOffset: 12, yOffset: 84 } } };
        (function(){
          var s1 = document.createElement("script"),
              s0 = document.getElementsByTagName("script")[0];
          s1.async = true;
          s1.src = ${JSON.stringify(src)};
          s1.charset = "UTF-8";
          s1.setAttribute("crossorigin", "*");
          s0.parentNode.insertBefore(s1, s0);
        })();
      `}
    </Script>
  );
}

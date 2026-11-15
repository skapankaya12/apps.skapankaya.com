import type { FeedItem } from "@/lib/feed";
import { BotAvatar, botColors } from "./GrokBotAvatar";

/**
 * A small square picture for a feed item, used in the guide's results: the
 * cover image when there is one, the bot itself for Grok Bots, and the first
 * letter on the item's colour for everything else.
 */
export function FeedThumb({ item, className = "" }: { item: FeedItem; className?: string }) {
  if (item.kind === "bot") {
    return (
      <span className={`grid place-items-center ${className}`}>
        <BotAvatar id={item.id.slice(4)} className="h-full w-full" />
      </span>
    );
  }
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image} alt="" loading="lazy" className={`object-cover ${className}`} />
    );
  }
  const [dark, light] = botColors(item.id);
  return (
    <span
      className={`grid place-items-center text-sm font-semibold text-white ${className}`}
      style={{ background: `linear-gradient(160deg, ${dark}, ${light})` }}
      aria-hidden
    >
      {item.title.charAt(0).toUpperCase()}
    </span>
  );
}

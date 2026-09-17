import { BookmarkSimple, ChatCircle, Heart, Repeat } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import type { ReactNode } from "react";
import { TrackedLink } from "./tracked-link";
import { CellGrid } from "./ui";

interface Post {
  handle: string;
  name: string;
  role: string;
  avatar: string;
  url: string;
  /** The post itself, split so mentions and links keep X's blue without dangerouslySetInnerHTML. */
  body: ReactNode;
  at: string;
  views: string;
  replies: string;
  reposts: string | null;
  likes: string;
  bookmarks: string;
}

const link = "text-accent-text";

/**
 * What people at Meta said about Helicon on X, quoted exactly, with each post's own numbers as they stood on
 * 18 September 2026. They shared it; none of this is an endorsement by Meta, and the line under the grid says so.
 */
const POSTS: Post[] = [
  {
    handle: "alexandr_wang",
    name: "Alexandr Wang",
    role: "Chief AI Officer, Meta",
    avatar: "/social/alexandr_wang.jpg",
    url: "https://x.com/alexandr_wang/status/2100590733627715684",
    body: "harjot here built a pretty sick unofficial muse code app for windows!",
    at: "7:50 PM · Sep 17, 2026",
    views: "37.7K",
    replies: "42",
    reposts: "23",
    likes: "324",
    bookmarks: "48",
  },
  {
    handle: "Answeror",
    name: "Cosmo Du",
    role: "Muse Code, Meta",
    avatar: "/social/Answeror.png",
    url: "https://x.com/Answeror/status/2100457921113170092",
    body: (
      <>
        really impressive desktop app by <span className={link}>@harjjotsinghh</span> built on{" "}
        <span className={link}>github.com/meta-models/mu…</span>
      </>
    ),
    at: "11:02 AM · Sep 17, 2026",
    views: "3,086",
    replies: "5",
    reposts: "3",
    likes: "33",
    bookmarks: "5",
  },
  {
    handle: "mjdouglas",
    name: "Michael Douglas",
    role: "Muse Code, Meta",
    avatar: "/social/mjdouglas.jpg",
    url: "https://x.com/mjdouglas/status/2100399865562059121",
    body: "Super impressive community-made desktop app for Muse Code. Well done, Harjot!",
    at: "7:12 AM · Sep 17, 2026",
    views: "2,435",
    replies: "2",
    reposts: null,
    likes: "20",
    bookmarks: "1",
  },
];

/** X's verified badge, from their own mark. */
function Verified() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Verified account" role="img" className="size-[18px] shrink-0 text-[#1d9bf0]">
      <path
        fill="currentColor"
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"
      />
    </svg>
  );
}

function Metric({ icon, value, className }: { icon: ReactNode; value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] tabular-nums ${className ?? "text-subtle"}`}>
      {icon}
      {value}
    </span>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="relative flex flex-col gap-3 bg-bg px-5 py-6 transition-colors duration-150 hover:bg-sunken sm:px-8">
      <TrackedLink
        href={post.url}
        placement="shared_by"
        eventLabel={post.name}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <span className="sr-only">Read {post.name}&rsquo;s post on X</span>
      </TrackedLink>
      <header className="flex items-center gap-3">
        {/* Local copies: the cards keep working whether or not X serves the images. */}
        <Image
          src={post.avatar}
          alt=""
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-full bg-sunken object-cover"
        />
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-[15px] font-semibold text-fg">
            <span className="truncate">{post.name}</span>
            <Verified />
          </span>
          <span className="block truncate text-[14px] text-subtle">
            @{post.handle} · {post.role}
          </span>
        </div>
      </header>

      <p className="text-[15px] leading-[1.5] text-fg sm:text-[17px]">{post.body}</p>

      <p className="text-[13px] text-subtle">
        {post.at} · <span className="font-semibold text-muted tabular-nums">{post.views}</span> Views
      </p>

      <footer className="mt-auto flex items-center gap-5 border-t border-line pt-3">
        <Metric icon={<ChatCircle aria-hidden="true" className="size-[18px]" />} value={post.replies} />
        {post.reposts ? (
          <Metric icon={<Repeat aria-hidden="true" className="size-[18px]" />} value={post.reposts} />
        ) : null}
        <Metric
          icon={<Heart aria-hidden="true" weight="fill" className="size-[18px] text-[#f91880]" />}
          value={post.likes}
          className="text-muted"
        />
        <Metric icon={<BookmarkSimple aria-hidden="true" className="size-[18px]" />} value={post.bookmarks} />
      </footer>
    </article>
  );
}

export function SharedBy() {
  return (
    <section aria-label="What people at Meta said about Helicon" className="bg-bg">
      <CellGrid className="lg:grid-cols-3">
        {POSTS.map((post) => (
          <PostCard key={post.handle} post={post} />
        ))}
      </CellGrid>
    </section>
  );
}

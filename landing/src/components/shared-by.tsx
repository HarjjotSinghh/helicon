import { TrackedLink } from "./tracked-link";
import { CellGrid } from "./ui";

/**
 * What people at Meta said about Helicon on X, quoted exactly. They shared it; none of this is an endorsement
 * by Meta, and the line under the grid says so.
 */
const QUOTES = [
  {
    quote: "harjot here built a pretty sick unofficial muse code app for windows!",
    name: "Alexandr Wang",
    handle: "alexandr_wang",
    role: "Chief AI Officer, Meta",
  },
  {
    quote: "Super impressive community-made desktop app for Muse Code. Well done, Harjot!",
    name: "Michael Douglas",
    handle: "mjdouglas",
    role: "Muse Code, Meta",
  },
  {
    quote: "really impressive desktop app by @harjjotsinghh built on github.com/meta-models/muse-code-sdk",
    name: "Cosmo Du",
    handle: "Answeror",
    role: "Muse Code, Meta",
  },
] as const;

export function SharedBy() {
  return (
    <section aria-labelledby="shared-by-title" className="bg-bg">
      <CellGrid className="lg:grid-cols-3">
        {QUOTES.map(({ quote, name, handle, role }) => (
          <figure key={handle} className="flex flex-col gap-4 bg-bg px-5 py-6 sm:px-8">
            <blockquote className="text-[15px] leading-[1.55] text-balance text-fg sm:text-[16px]">“{quote}”</blockquote>
            <figcaption className="mt-auto text-[13px] leading-snug">
              <TrackedLink
                href={`https://x.com/${handle}`}
                placement="shared_by"
                eventLabel={name}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                {name}
              </TrackedLink>
              <span className="block text-subtle">{role}</span>
            </figcaption>
          </figure>
        ))}
      </CellGrid>
      <p id="shared-by-title" className="px-5 pt-4 pb-6 text-[13px] leading-snug text-muted sm:px-8">
        Shared on X in September 2026. Helicon is an unofficial community project: Meta has not endorsed it, and it is
        not affiliated with Meta.
      </p>
    </section>
  );
}

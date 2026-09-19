import { Compass } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { SECTIONS, pagesInSection } from "@/lib/seo/catalog";
import { SectionHeading, bandX, cn } from "../ui";

/**
 * The home page's index of everything else on the site. It is here for people who want the
 * detail, and it is here because a page nothing links to is a page nothing crawls.
 */
export function SiteIndex() {
  return (
    <section id="browse" aria-labelledby="browse-title" className={cn(bandX, "py-14 sm:py-20")}>
      <div data-reveal="rise">
        <SectionHeading
          id="browse-title"
          icon={<Compass weight="duotone" />}
          title="Everything else, in detail"
        >
          Install guides per platform, honest comparisons with the terminal and the editor
          extensions, one page per capability, and plain definitions for the vocabulary.
        </SectionHeading>
      </div>

      <div data-stagger="50" data-base="120" className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        <nav data-reveal aria-labelledby="browse-start">
          <h3 id="browse-start" className="text-[13px] font-semibold text-fg">
            Start here
          </h3>
          <ul className="mt-3 space-y-2">
            {[
              { href: "/muse-code-gui", label: "Muse Code GUI options" },
              { href: "/muse-code-desktop-app", label: "The desktop app" },
              { href: "/pricing", label: "Pricing" },
              { href: "/faq", label: "Full FAQ" },
              { href: "/changelog", label: "Changelog" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[14px] leading-snug text-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {SECTIONS.map((section) => (
          <nav key={section.id} data-reveal aria-labelledby={`browse-${section.id}`}>
            <h3 id={`browse-${section.id}`} className="text-[13px] font-semibold text-fg">
              <Link href={`/${section.slug}`} className="transition-colors hover:text-accent-text">
                {section.label}
              </Link>
            </h3>
            <ul className="mt-3 space-y-2">
              {pagesInSection(section.id).map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="text-[14px] leading-snug text-muted transition-colors hover:text-fg"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

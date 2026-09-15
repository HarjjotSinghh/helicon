import { ChartBar, ChatsCircle, Command, GearSix, House } from "@phosphor-icons/react/ssr";
import { AppTour, type TourShot } from "@/components/app-tour";
import { Architecture } from "@/components/architecture";
import { Compare } from "@/components/compare";
import { Faq } from "@/components/faq";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { Install } from "@/components/install";
import { SiteHeader } from "@/components/site-header";
import { ClosingCta, SiteFooter } from "@/components/site-footer";
import { DemoApp } from "@/demo/demo-app";
import { Rule } from "@/components/ui";
import { StructuredData } from "@/components/structured-data";
import { getPageCopy } from "@/lib/copy";
import { latestRelease } from "@/lib/github-release";
import { getVisitorOs } from "@/lib/visitor";

const shots: TourShot[] = [
  {
    id: "thread",
    label: "Threads",
    title: "Thread",
    icon: <ChatsCircle weight="duotone" />,
    body: "A thread waiting on your approval. Allow the test run and watch the turn finish, or send a message of your own.",
    view: <DemoApp route="#/t/api-paginate" label="Live demo: a thread waiting on an approval" poster={{ light: "/assets/thread-light.png", dark: "/assets/thread.png", alt: "A Helicon thread waiting on an approval" }} />,
  },
  {
    id: "usage",
    label: "Usage and cost",
    title: "Usage",
    icon: <ChartBar weight="duotone" />,
    body: "What each thread would have cost at API rates, by day, by model and by thread.",
    view: <DemoApp route="#/usage" label="Live demo: the usage and cost page" poster={{ light: "/assets/usage-light.png", dark: "/assets/usage.png", alt: "Helicon usage and cost" }} />,
  },
  {
    id: "home",
    label: "Home",
    title: "Home",
    icon: <House weight="duotone" />,
    body: "Start a thread in any project. Recent work per project sits right by the composer.",
    view: <DemoApp route="" label="Live demo: the home screen" poster={{ light: "/assets/home-light.png", dark: "/assets/home.png", alt: "Helicon home screen" }} />,
  },
  {
    id: "palette",
    label: "Command palette",
    title: "Command palette",
    icon: <Command weight="duotone" />,
    body: "Jump to any project, session or action without reaching for the mouse.",
    view: <DemoApp route="#/t/readme-oneliner" palette label="Live demo: the command palette" poster={{ light: "/assets/palette-light.png", dark: "/assets/palette.png", alt: "Helicon command palette" }} />,
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings",
    icon: <GearSix weight="duotone" />,
    body: "Model, reasoning effort, approvals and daemon configuration. The theme follows your system.",
    view: <DemoApp route="#/settings" label="Live demo: settings" poster={{ light: "/assets/settings-light.png", dark: "/assets/settings.png", alt: "Helicon settings" }} />,
  },
];

export const dynamic = "force-dynamic";

export default async function Page() {
  const [os, release] = await Promise.all([getVisitorOs(), latestRelease()]);
  const copy = getPageCopy(os);
  const version = release?.version ?? null;
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-btn px-4 py-2 font-medium text-btn-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="page-frame relative mx-auto min-h-dvh w-full max-w-[1200px] border-line bg-bg max-[360px]:border-x-0 min-[361px]:w-[calc(100%-1rem)] min-[361px]:border-x sm:w-[calc(100%-3rem)] pb-[env(safe-area-inset-bottom)]">
        <SiteHeader copy={copy} />
        <main id="main">
          <Hero copy={copy} version={version} notesUrl={release?.notesUrl ?? ""} />
          <Rule />
          <Features title={copy.featuresTitle} body={copy.featuresBody} />
          <Rule />
          <AppTour shots={shots} />
          <Rule />
          <Architecture extra={copy.howExtra} />
          <Rule />
          <Compare body={copy.compareBody} />
          <Rule />
          <Install version={version} />
          <Rule />
          <Faq audience={copy.audience} intro={copy.faqIntro} />
          <Rule />
          <ClosingCta copy={copy} />
          <Rule />
        </main>
        <SiteFooter />
      </div>
      <StructuredData version={version} />
    </>
  );
}

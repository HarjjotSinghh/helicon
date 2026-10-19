import type { Locale } from "./i18n";

/**
 * Copy for the translated home pages. Each entry says the same things as the English home page
 * (src/app/(site)/page.tsx and the components it renders), fact for fact: change a claim there and
 * it changes here too. Product names, CLI names and code stay in English.
 */
export type HomeCopy = {
  meta: { title: string; description: string; ogDescription: string };
  ui: {
    skip: string;
    home: string;
    github: string;
    openMenu: string;
    closeMenu: string;
    sections: string;
    language: string;
    theme: { group: string; system: string; light: string; dark: string };
    player: {
      region: string;
      start: string;
      play: string;
      pause: string;
      mute: string;
      unmute: string;
      enterFullscreen: string;
      exitFullscreen: string;
      seek: string;
    };
  };
  nav: { tour: string; features: string; how: string; install: string; faq: string };
  hero: {
    releaseNotes: string;
    headline: string;
    lead: string;
    body: string;
    download: { windows: string; macos: string; linux: string; other: string };
    viewSource: string;
    tryInBrowser: string;
    unofficial: string;
    facts: { title: string; body: string }[];
  };
  videoLabel: string;
  tour: {
    title: string;
    intro: string;
    tabs: string;
    shots: Record<"thread" | "usage" | "home" | "palette" | "settings", { label: string; body: string }>;
  };
  features: { title: string; intro: string; items: { title: string; body: string }[] };
  how: { title: string; body: string; nodes: { title: string; detail: string }[] };
  install: { title: string; intro: string; allOptions: string; vscode: string };
  faq: { title: string; intro: string; items: [string, string][] };
  closing: { title: string; body: string };
  footer: { englishNote: string; guides: string; faq: string; changelog: string; trademark: string };
  /** Shown on the English page, in this language, to visitors whose browser asks for it. */
  hint: { text: string; action: string; dismiss: string };
};

const ko: HomeCopy = {
  meta: {
    title: "Helicon: Windows, macOS, Linux용 Muse Code 데스크톱 앱",
    description:
      "Meta의 Muse Code CLI를 위한 무료 오픈소스 데스크톱·웹 앱. 모든 프로젝트, 세션, diff, 승인, 비용을 한 창에서 봅니다. 지금 쓰는 구독 그대로 동작합니다.",
    ogDescription: "같은 Muse Code, 같은 구독, 더 나은 화면. muse CLI를 위한 무료 오픈소스 데스크톱·웹 앱.",
  },
  ui: {
    skip: "본문으로 건너뛰기",
    home: "Helicon 홈",
    github: "GitHub의 Helicon",
    openMenu: "메뉴 열기",
    closeMenu: "메뉴 닫기",
    sections: "페이지 섹션",
    language: "언어",
    theme: { group: "색상 테마", system: "시스템 테마", light: "라이트 테마", dark: "다크 테마" },
    player: {
      region: "동영상 플레이어. 스페이스 키로 재생하거나 일시정지합니다",
      start: "소개 영상 재생",
      play: "재생",
      pause: "일시정지",
      mute: "음소거",
      unmute: "음소거 해제",
      enterFullscreen: "전체 화면",
      exitFullscreen: "전체 화면 종료",
      seek: "재생 위치",
    },
  },
  nav: { tour: "데모", features: "기능", how: "동작 방식", install: "설치", faq: "FAQ" },
  hero: {
    releaseNotes: "릴리스 노트 보기",
    headline: "Meta의 코딩 에이전트 Muse Code를 위한 데스크톱 앱",
    lead: "모든 세션, diff, 승인을 한 창에서. 이미 결제하고 있는 Muse Code 요금제 그대로 씁니다.",
    body: "무료 오픈소스입니다. Windows(WSL 불필요), macOS, Linux에서 네이티브로 돌아가고 VS Code 확장도 있습니다.",
    download: {
      windows: "Windows용 다운로드",
      macos: "macOS용 다운로드",
      linux: "Linux 설치 방법",
      other: "다운로드",
    },
    viewSource: "소스 보기",
    tryInBrowser: "먼저 브라우저에서 써 보기",
    unofficial: "비공식 커뮤니티 프로젝트입니다. Meta와 관련이 없습니다.",
    facts: [
      { title: "MIT 라이선스", body: "무료, 유료 플랜 없음" },
      { title: "추가 요금 없음", body: "쓰던 Muse Code 요금제로 동작" },
      { title: "내 로그인 그대로", body: "자격 증명은 muse에만 저장" },
      { title: "로컬 데이터", body: "내 컴퓨터의 SQLite" },
    ],
  },
  videoLabel: "30초로 보는 Helicon: 읽을 수 있는 승인, 수정한 자리에 뜨는 diff, 스레드별 비용",
  tour: {
    title: "여기서 바로 앱을 써 보세요",
    intro:
      "샘플 데이터로 브라우저에서 돌아가는 실제 Helicon 화면입니다. 화면을 고른 뒤 스레드를 열고, 명령을 승인하고, 메시지를 보내 보세요. 앱 화면은 영어입니다.",
    tabs: "앱 화면",
    shots: {
      thread: { label: "스레드", body: "승인을 기다리는 스레드입니다. 테스트 실행을 허용하고 턴이 끝나는 걸 보거나, 직접 메시지를 보내 보세요." },
      usage: { label: "사용량과 비용", body: "API 요금 기준으로 각 스레드가 얼마였을지 날짜별, 모델별, 스레드별로 보여 줍니다." },
      home: { label: "홈", body: "어느 프로젝트에서든 스레드를 시작하세요. 프로젝트별 최근 작업이 입력창 바로 옆에 있습니다." },
      palette: { label: "명령 팔레트", body: "마우스에 손대지 않고 프로젝트, 세션, 동작으로 바로 이동합니다." },
      settings: { label: "설정", body: "모델, 추론 강도, 승인, 데몬 설정. 테마는 시스템 설정을 따릅니다." },
    },
  },
  features: {
    title: "세션에 필요한 모든 것을 한 창에",
    intro:
      "병렬 서브에이전트와 다시 볼 수 있는 이벤트 로그는 터미널에서 제대로 쓰기 어렵습니다. 프로젝트, diff, 승인, 비용을 나란히 봅니다.",
    items: [
      { title: "프로젝트별로 정리", body: "스레드가 폴더별로 묶이고 worktree도 포함됩니다. 어떤 스레드든 클릭 한 번으로 이어서 작업합니다." },
      { title: "인라인 diff", body: "모든 수정이 일어난 그 자리에서 diff로 스레드에 표시됩니다. 스크롤을 거슬러 찾을 필요가 없습니다." },
      { title: "승인은 승인답게", body: "승인 요청은 도착하는 즉시 보여 줍니다. 묶어서 처리하거나 건너뛰지 않습니다." },
      { title: "비용을 투명하게", body: "각 스레드가 API 요금으로 얼마였을지 보여 주므로 요금제가 무슨 일을 하는지 알 수 있습니다." },
      { title: "키보드 우선", body: "명령 팔레트, 슬래시 명령, 모델 선택기. 어떤 스레드든 키보드로 이동합니다." },
      { title: "하나의 UI, 두 가지 형태", body: "같은 React 화면이 Tauri 데스크톱 앱으로도, 원격 데몬에 연결하는 웹 앱으로도 나옵니다." },
    ],
  },
  how: {
    title: "터미널 스크래핑 없음",
    body:
      "로컬 데몬이 워크스페이스마다 muse serve 호스트를 하나씩 띄우고, Meta의 공식 MIT 라이브러리 @muse-code/sdk로 Muse Code Session Protocol을 주고받습니다. 인증은 본인의 muse login을 쓰고, Helicon은 자격 증명을 저장하지 않으며 모든 상태는 로컬 SQLite에 있습니다.",
    nodes: [
      { title: "Helicon UI", detail: "Tauri 데스크톱 앱 또는 웹 앱" },
      { title: "로컬 데몬", detail: "SQLite 상태, 워크스페이스마다 호스트 하나" },
      { title: "muse serve", detail: "@muse-code/sdk를 통한 Muse Session Protocol" },
    ],
  },
  install: {
    title: "설치",
    intro: "muse CLI가 설치되어 있고 본인 계정으로 로그인되어 있어야 합니다. 데스크톱 앱에는 Node.js가 들어 있습니다.",
    allOptions: "모든 설치 방법 (영어)",
    vscode: "VS Code 확장 (영어)",
  },
  faq: {
    title: "자주 묻는 질문",
    intro: "요금, 자격 증명, Windows, 그리고 공식 프로젝트인지까지. 짧게 답합니다.",
    items: [
      [
        "공식 프로젝트인가요?",
        "아닙니다. Helicon은 MIT 라이선스의 비공식 커뮤니티 프로젝트이며, Meta가 만들거나 후원하거나 보증하지 않습니다. Muse Code CLI용 클라이언트이고 Mac용 Muse 어시스턴트 앱과는 관계가 없습니다. \"Muse\"와 \"Muse Code\"는 Meta의 상표이며, Helicon이 무엇과 함께 동작하는지 설명하기 위해서만 씁니다.",
      ],
      ["별도의 API 키가 필요한가요?", "아니요. Helicon은 muse CLI를 통해 이미 쓰고 있는 Muse Code 구독을 사용합니다. 추가 요금은 없습니다."],
      ["자격 증명은 어디에 저장되나요?", "muse CLI에, 본인의 muse 로그인으로 저장됩니다. Helicon은 자격 증명을 저장하거나 다루지 않습니다."],
      [
        "Windows에서는 어떻게 동작하나요?",
        "이제 Muse Code가 Windows에서 네이티브로 돌아가고, Helicon은 그것을 직접 실행합니다. Windows 경로를 그대로 쓰고 셸 명령은 PowerShell로 실행하며 WSL은 필요 없습니다. WSL2 안의 Muse Code도 계속 동작하고, 네이티브 Muse Code가 없으면 Helicon이 그쪽을 씁니다.",
      ],
      [
        "무료 Muse 앱으로도 쓸 수 있나요?",
        "아니요. Helicon이 구동하는 코딩 에이전트 Muse Code는 Muse Code 요금제나 Meta Model API의 종량제 결제가 필요합니다. 무료 Muse 앱은 다른 제품이라 Muse Code가 포함되지 않습니다. Helicon 자체는 무료이고 비용을 더하지 않습니다.",
      ],
      [
        "Helicon이 외부로 데이터를 보내나요?",
        "업데이트 확인만 합니다. 데스크톱 앱이 helicon.sh에 새 버전이 있는지 묻고, 이 요청에는 플랫폼, 버전, 요청 IP의 주간 해시가 담깁니다. 코드, 프롬프트, 스레드, 파일은 컴퓨터 밖으로 나가지 않으며 계정도 없습니다.",
      ],
      ["정말 무료인가요?", "네. MIT 라이선스, 유료 플랜 없음, 소스는 GitHub에 있습니다. 이미 쓰고 있는 Muse Code 구독을 쓰므로 추가 요금도 없습니다."],
    ],
  },
  closing: {
    title: "스레드를 터미널 밖으로 꺼내세요.",
    body: "무료, MIT 라이선스. 이미 쓰고 있는 Muse Code 구독으로 동작합니다.",
  },
  footer: {
    englishNote: "가이드와 문서는 영어로만 제공됩니다.",
    guides: "가이드 (영어)",
    faq: "전체 FAQ (영어)",
    changelog: "변경 내역 (영어)",
    trademark: "\"Muse\"와 \"Muse Code\"는 Meta의 상표입니다. Helicon은 비공식 커뮤니티 프로젝트입니다.",
  },
  hint: { text: "이 페이지는 한국어로도 볼 수 있습니다.", action: "한국어로 보기", dismiss: "닫기" },
};

const ja: HomeCopy = {
  meta: {
    title: "Helicon: Windows・macOS・Linux 向け Muse Code デスクトップアプリ",
    description:
      "Meta の Muse Code CLI のための、無料でオープンソースのデスクトップ／Web アプリ。プロジェクト、セッション、差分、承認、コストをひとつのウィンドウにまとめます。今のサブスクリプションのまま使えます。",
    ogDescription: "同じ Muse Code、同じサブスクリプション、もっと使いやすい画面。muse CLI のための無料オープンソースアプリ。",
  },
  ui: {
    skip: "本文へスキップ",
    home: "Helicon ホーム",
    github: "GitHub の Helicon",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    sections: "ページのセクション",
    language: "言語",
    theme: { group: "カラーテーマ", system: "システムのテーマ", light: "ライトテーマ", dark: "ダークテーマ" },
    player: {
      region: "動画プレーヤー。スペースキーで再生と一時停止を切り替えます",
      start: "紹介動画を再生",
      play: "再生",
      pause: "一時停止",
      mute: "ミュート",
      unmute: "ミュート解除",
      enterFullscreen: "全画面表示",
      exitFullscreen: "全画面表示を終了",
      seek: "再生位置",
    },
  },
  nav: { tour: "デモ", features: "機能", how: "仕組み", install: "インストール", faq: "FAQ" },
  hero: {
    releaseNotes: "リリースノートを読む",
    headline: "Meta のコーディングエージェント Muse Code のためのデスクトップアプリ",
    lead: "セッション、差分、承認をひとつのウィンドウで。契約中の Muse Code プランのまま使えます。",
    body: "無料でオープンソース。Windows（WSL 不要）、macOS、Linux でネイティブに動き、VS Code 拡張もあります。",
    download: {
      windows: "Windows 版をダウンロード",
      macos: "macOS 版をダウンロード",
      linux: "Linux へのインストール",
      other: "ダウンロード",
    },
    viewSource: "ソースを見る",
    tryInBrowser: "まずブラウザで試す",
    unofficial: "非公式のコミュニティプロジェクトです。Meta とは関係ありません。",
    facts: [
      { title: "MIT ライセンス", body: "無料、有料プランなし" },
      { title: "追加の請求なし", body: "今の Muse Code プランで動作" },
      { title: "ログインはそのまま", body: "認証情報は muse の中だけ" },
      { title: "データはローカル", body: "手元の SQLite に保存" },
    ],
  },
  videoLabel: "30 秒でわかる Helicon：読める承認、編集した場所に出る差分、スレッドごとのコスト",
  tour: {
    title: "ここでアプリを試せます",
    intro:
      "サンプルデータを使ってブラウザ上で動く、本物の Helicon の画面です。画面を選んで、スレッドを開いたり、コマンドを承認したり、メッセージを送ったりしてみてください。アプリの表示は英語です。",
    tabs: "アプリの画面",
    shots: {
      thread: { label: "スレッド", body: "承認待ちのスレッドです。テストの実行を許可してターンが終わるのを見るか、自分でメッセージを送ってみてください。" },
      usage: { label: "使用量とコスト", body: "各スレッドが API 料金ならいくらだったかを、日別・モデル別・スレッド別に表示します。" },
      home: { label: "ホーム", body: "どのプロジェクトでもスレッドを始められます。プロジェクトごとの最近の作業が入力欄のすぐ横に並びます。" },
      palette: { label: "コマンドパレット", body: "マウスに手を伸ばさずに、プロジェクト、セッション、操作へすぐ移動できます。" },
      settings: { label: "設定", body: "モデル、推論の強さ、承認、デーモンの設定。テーマはシステムの設定に合わせます。" },
    },
  },
  features: {
    title: "セッションに必要なものを、ひとつのウィンドウに",
    intro:
      "並列のサブエージェントや見返せるイベントログは、ターミナルでは活かしきれません。プロジェクト、差分、承認、コストを並べて見られます。",
    items: [
      { title: "プロジェクトごとに整理", body: "スレッドはフォルダごとにまとまり、worktree も含みます。どのスレッドもワンクリックで再開できます。" },
      { title: "インライン差分", body: "すべての編集が、起きたその場所に差分としてスレッドに表示されます。スクロールして探す必要はありません。" },
      { title: "承認は承認のまま", body: "承認の依頼は届いたその瞬間に表示します。まとめたり、飛ばしたりはしません。" },
      { title: "コストを見える化", body: "各スレッドが API 料金ならいくらかを表示するので、プランが何をしているかがわかります。" },
      { title: "キーボード中心", body: "コマンドパレット、スラッシュコマンド、モデルの切り替え。どのスレッドにもキーボードで移動できます。" },
      { title: "ひとつの UI、ふたつの形", body: "同じ React の画面が、Tauri のデスクトップアプリとしても、リモートのデーモンにつなぐ Web アプリとしても動きます。" },
    ],
  },
  how: {
    title: "ターミナルの出力を読み取らない",
    body:
      "ローカルのデーモンがワークスペースごとに muse serve のホストをひとつ起動し、Meta 公式の MIT ライブラリ @muse-code/sdk を通じて Muse Code Session Protocol でやり取りします。認証はあなた自身の muse login を使い、Helicon は認証情報を保存しません。状態はすべてローカルの SQLite にあります。",
    nodes: [
      { title: "Helicon UI", detail: "Tauri のデスクトップアプリか Web アプリ" },
      { title: "ローカルのデーモン", detail: "SQLite で状態を保持、ワークスペースごとにホストひとつ" },
      { title: "muse serve", detail: "@muse-code/sdk 経由の Muse Session Protocol" },
    ],
  },
  install: {
    title: "インストール",
    intro: "muse CLI をインストールし、自分のアカウントでログインしておいてください。デスクトップアプリには Node.js が同梱されています。",
    allOptions: "すべてのインストール方法（英語）",
    vscode: "VS Code 拡張（英語）",
  },
  faq: {
    title: "よくある質問",
    intro: "料金、認証情報、Windows、そして公式かどうか。短く答えます。",
    items: [
      [
        "公式のプロジェクトですか？",
        "いいえ。Helicon は MIT ライセンスの非公式コミュニティプロジェクトで、Meta が作成・後援・保証したものではありません。Muse Code CLI のクライアントで、Mac 向けの Muse アシスタントアプリとは関係ありません。「Muse」と「Muse Code」は Meta の商標で、Helicon が何と連携するかを示すためだけに使っています。",
      ],
      ["別の API キーは必要ですか？", "いいえ。Helicon は muse CLI を通じて、契約中の Muse Code サブスクリプションを使います。追加の請求はありません。"],
      ["認証情報はどこに保存されますか？", "muse CLI の中に、あなた自身の muse ログインとして保存されます。Helicon が認証情報を保存したり扱ったりすることはありません。"],
      [
        "Windows ではどう動きますか？",
        "Muse Code は Windows でネイティブに動くようになり、Helicon はそれを直接実行します。Windows のパスをそのまま使い、シェルコマンドは PowerShell で実行し、WSL は不要です。WSL2 上の Muse Code も引き続き使え、ネイティブの Muse Code がない場合は Helicon がそちらを使います。",
      ],
      [
        "無料の Muse アプリでも使えますか？",
        "いいえ。Helicon が動かすコーディングエージェント Muse Code には、Muse Code プランか Meta Model API の従量課金が必要です。無料の Muse アプリは別の製品で、Muse Code は含まれません。Helicon 自体は無料で、独自の費用はかかりません。",
      ],
      [
        "Helicon は外部に通信しますか？",
        "アップデートの確認だけです。デスクトップアプリが helicon.sh に新しいバージョンがあるかを問い合わせ、その際にプラットフォーム、バージョン、送信元 IP の週ごとのハッシュが送られます。コード、プロンプト、スレッド、ファイルが手元のマシンから出ることはなく、アカウントもありません。",
      ],
      ["本当に無料ですか？", "はい。MIT ライセンスで有料プランはなく、ソースは GitHub にあります。契約中の Muse Code サブスクリプションを使うので、追加の請求もありません。"],
    ],
  },
  closing: {
    title: "スレッドをターミナルの外へ。",
    body: "無料、MIT ライセンス。今の Muse Code サブスクリプションで動きます。",
  },
  footer: {
    englishNote: "ガイドとドキュメントは英語のみです。",
    guides: "ガイド（英語）",
    faq: "FAQ の全文（英語）",
    changelog: "変更履歴（英語）",
    trademark: "「Muse」と「Muse Code」は Meta の商標です。Helicon は非公式のコミュニティプロジェクトです。",
  },
  hint: { text: "このページは日本語でも読めます。", action: "日本語で見る", dismiss: "閉じる" },
};

const ptBr: HomeCopy = {
  meta: {
    title: "Helicon: app desktop do Muse Code (Windows, macOS, Linux)",
    description:
      "App desktop e web, gratuito e de código aberto, para a CLI Muse Code da Meta. Projetos, sessões, diffs, aprovações e custos em uma janela, no seu plano atual.",
    ogDescription: "O mesmo Muse Code, a mesma assinatura, uma interface melhor. App gratuito e de código aberto para a CLI muse.",
  },
  ui: {
    skip: "Pular para o conteúdo",
    home: "Início do Helicon",
    github: "Helicon no GitHub",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    sections: "Seções da página",
    language: "Idioma",
    theme: { group: "Tema de cores", system: "Tema do sistema", light: "Tema claro", dark: "Tema escuro" },
    player: {
      region: "Player de vídeo. Aperte Espaço para reproduzir ou pausar",
      start: "Assistir ao vídeo",
      play: "Reproduzir",
      pause: "Pausar",
      mute: "Silenciar",
      unmute: "Ativar som",
      enterFullscreen: "Tela cheia",
      exitFullscreen: "Sair da tela cheia",
      seek: "Posição do vídeo",
    },
  },
  nav: { tour: "Demo", features: "Recursos", how: "Como funciona", install: "Instalar", faq: "Perguntas" },
  hero: {
    releaseNotes: "Ler as notas da versão",
    headline: "Um app desktop para o agente de código da Meta, o Muse Code.",
    lead: "Cada sessão, diff e aprovação em uma janela, no plano do Muse Code que você já paga.",
    body: "Gratuito e de código aberto. Nativo no Windows (sem WSL), macOS e Linux, e também como extensão do VS Code.",
    download: {
      windows: "Baixar para Windows",
      macos: "Baixar para macOS",
      linux: "Instalar no Linux",
      other: "Baixar",
    },
    viewSource: "Ver o código",
    tryInBrowser: "Teste antes no navegador",
    unofficial: "Projeto não oficial da comunidade. Sem vínculo com a Meta.",
    facts: [
      { title: "Licença MIT", body: "Gratuito, sem plano pago" },
      { title: "Sem segunda cobrança", body: "Usa o seu plano do Muse Code" },
      { title: "Seu próprio login", body: "Credenciais ficam no muse" },
      { title: "Dados locais", body: "SQLite na sua máquina" },
    ],
  },
  videoLabel: "O Helicon em 30 segundos: aprovações que dá para ler, diffs onde a edição aconteceu e o custo de cada thread",
  tour: {
    title: "Teste o app aqui mesmo",
    intro:
      "Esta é a interface real do Helicon rodando com dados de exemplo no seu navegador. Escolha uma tela e explore: abra threads, aprove um comando ou envie uma mensagem. O app está em inglês.",
    tabs: "Telas do app",
    shots: {
      thread: { label: "Thread", body: "Uma thread esperando sua aprovação. Libere a execução dos testes e veja o turno terminar, ou envie uma mensagem sua." },
      usage: { label: "Uso e custo", body: "Quanto cada thread teria custado nas tarifas da API, por dia, por modelo e por thread." },
      home: { label: "Início", body: "Comece uma thread em qualquer projeto. O trabalho recente de cada projeto fica ao lado do campo de mensagem." },
      palette: { label: "Paleta de comandos", body: "Vá para qualquer projeto, sessão ou ação sem tocar no mouse." },
      settings: { label: "Configurações", body: "Modelo, nível de raciocínio, aprovações e configuração do daemon. O tema segue o do sistema." },
    },
  },
  features: {
    title: "Tudo o que uma sessão precisa, em uma janela",
    intro:
      "No terminal, subagentes em paralelo e um log de eventos para rever acabam se perdendo. Projetos, diffs, aprovações e custo ficam lado a lado.",
    items: [
      { title: "Projetos agrupados", body: "Threads agrupadas por pasta, worktrees incluídas. Retome qualquer uma com um clique." },
      { title: "Diffs inline", body: "Cada edição aparece na thread como diff, bem onde aconteceu. Nada de caçar no histórico do terminal." },
      { title: "Aprovação é aprovação", body: "Cada pedido de aprovação aparece no momento em que chega. Nenhum é agrupado nem pulado." },
      { title: "Custo à vista", body: "Quanto cada thread custaria nas tarifas da API, para você ver o que o seu plano está fazendo." },
      { title: "Teclado primeiro", body: "Paleta de comandos, comandos com barra e seletor de modelo. Chegue a qualquer thread pelo teclado." },
      { title: "Uma interface, dois formatos", body: "A mesma interface React roda como app desktop Tauri e como app web ligado a um daemon remoto." },
    ],
  },
  how: {
    title: "Nada de raspar o terminal",
    body:
      "Um daemon local abre um host muse serve por workspace e fala o Muse Code Session Protocol pela biblioteca oficial da Meta, a @muse-code/sdk (MIT). A autenticação é o seu próprio muse login. O Helicon nunca guarda credenciais, e todo o estado fica em SQLite local.",
    nodes: [
      { title: "Helicon UI", detail: "App desktop Tauri ou app web" },
      { title: "Daemon local", detail: "Estado em SQLite, um host por workspace" },
      { title: "muse serve", detail: "Muse Session Protocol via @muse-code/sdk" },
    ],
  },
  install: {
    title: "Instalar",
    intro: "Você precisa da CLI muse instalada e com login na sua conta. O app desktop já vem com o próprio Node.js.",
    allOptions: "Todas as opções de instalação (em inglês)",
    vscode: "Extensão do VS Code (em inglês)",
  },
  faq: {
    title: "Perguntas frequentes",
    intro: "Cobrança, credenciais, Windows e se isto é oficial. Respostas diretas.",
    items: [
      [
        "Isto é oficial?",
        "Não. O Helicon é um projeto não oficial da comunidade, com licença MIT. Não é feito, patrocinado nem endossado pela Meta. É um cliente para a CLI Muse Code e não tem relação com o app assistente Muse para Mac. \"Muse\" e \"Muse Code\" são marcas da Meta, usadas aqui só para dizer com o que o Helicon funciona.",
      ],
      ["Preciso de uma chave de API separada?", "Não. O Helicon usa a sua assinatura atual do Muse Code pela CLI muse. Não existe segunda cobrança."],
      ["Onde ficam minhas credenciais?", "Na CLI muse, a partir do seu próprio login no muse. O Helicon nunca guarda nem manipula essas credenciais."],
      [
        "Como funciona no Windows?",
        "O Muse Code agora roda nativamente no Windows, e o Helicon o executa direto: seus caminhos do Windows, PowerShell para comandos de shell, sem WSL. O Muse Code dentro do WSL2 continua funcionando, e o Helicon usa essa opção quando o Muse Code nativo não está instalado.",
      ],
      [
        "Funciona com o app gratuito do Muse?",
        "Não. O Muse Code, o agente de código que o Helicon controla, exige um plano do Muse Code ou cobrança por uso na Model API da Meta. O app gratuito do Muse é outro produto e não inclui o Muse Code. O Helicon em si é gratuito e não adiciona custo nenhum.",
      ],
      [
        "O Helicon envia dados para algum lugar?",
        "Só para procurar atualizações. O app desktop pergunta ao helicon.sh se existe uma versão nova, e essa requisição informa a plataforma, a versão e um hash semanal do IP de origem. Nada do seu código, prompts, threads ou arquivos sai da sua máquina, e não existe conta.",
      ],
      ["É gratuito mesmo?", "Sim. Licença MIT, sem plano pago, código no GitHub. Usa a assinatura do Muse Code que você já tem, então não há segunda cobrança."],
    ],
  },
  closing: {
    title: "Tire suas threads do terminal.",
    body: "Gratuito, licença MIT, e roda na assinatura do Muse Code que você já tem.",
  },
  footer: {
    englishNote: "Os guias e a documentação estão só em inglês.",
    guides: "Guias (em inglês)",
    faq: "Todas as perguntas (em inglês)",
    changelog: "Novidades (em inglês)",
    trademark: "\"Muse\" e \"Muse Code\" são marcas da Meta. O Helicon é um projeto não oficial da comunidade.",
  },
  hint: { text: "Esta página também está em português.", action: "Ver em português", dismiss: "Fechar" },
};

export const HOME_COPY: Record<Locale, HomeCopy> = { ko, ja, "pt-br": ptBr };

/** The browser-language hint strings alone, for the English page. */
export const HOME_HINTS = Object.fromEntries(
  Object.entries(HOME_COPY).map(([locale, copy]) => [locale, copy.hint]),
) as Record<Locale, HomeCopy["hint"]>;

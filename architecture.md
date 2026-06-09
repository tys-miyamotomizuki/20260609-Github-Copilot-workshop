# ポモドーロタイマー Web アプリケーション アーキテクチャ案

## 1. 目的

このドキュメントは、本リポジトリで開発するポモドーロタイマー Web アプリケーションのアーキテクチャ案をまとめたものです。

対象のアプリは、以下の要件を満たすことを前提とします。

- Flask をサーバーサイドのアプリケーション基盤として利用する
- HTML / CSS / JavaScript で UI を構築する
- 添付モックのような単一画面のタイマー UI を提供する
- 将来的な設定保存や実績記録の拡張に耐えられる
- ユニットテストを書きやすい構成にする


## 2. 全体方針

初期段階では、Flask は薄いサーバーとして使い、タイマーの実行ロジックはクライアントサイド JavaScript に持たせる構成を採用します。

理由は以下の通りです。

- ポモドーロタイマーはブラウザ単体で完結できる振る舞いが中心である
- 秒単位のカウントダウンをサーバーで常駐管理する必要がない
- 初期実装を小さく保ちつつ、必要に応じて API や永続化を後から追加できる
- タイマーコアを pure function 中心で設計しやすく、ユニットテストに向く

要するに、最初は「Flask で画面を返す + フロントエンドで状態管理する」構成を基本とし、将来必要になったら Flask API と SQLite などを追加する段階的な設計とします。


## 3. 現状からの整理方針

現在のリポジトリには Node / Express のサンプル構成が残っています。

- [app.py](app.py) は空ファイルで、Flask の入口として未使用
- [index.js](index.js) は Express の起動ファイル
- [views/index.ejs](views/index.ejs) は EJS テンプレート
- [public/css/main.css](public/css/main.css) は Express 側の静的 CSS

このため、今後の実装では Flask 標準構成に寄せていくのが妥当です。

想定する移行方針は以下です。

- Flask のエントリポイントを [app.py](app.py) に一本化する
- テンプレートは templates ディレクトリへ移す
- 静的ファイルは static ディレクトリへ移す
- Express 前提の [index.js](index.js) と [views/index.ejs](views/index.ejs) は段階的に役割を終える


## 4. 推奨アーキテクチャ

### 4.1 サーバーサイド

Flask は以下の責務に絞ります。

- 画面の初期表示を返す
- 将来的な設定取得、設定保存、実績保存 API を受け持つ
- テンプレートと静的ファイルを配信する

初期段階では、ルートは最低限で十分です。

- GET /

将来拡張する場合は、以下の API を追加しやすい設計にします。

- GET /api/settings
- POST /api/settings
- GET /api/stats/today
- POST /api/sessions/complete


### 4.2 クライアントサイド

クライアントサイドは以下の 3 層に分けます。

1. domain
タイマー状態、時間計算、進捗率、日次統計などの純粋な業務ロジックを持つ層。

2. services / adapters
時計取得、localStorage、将来の API 通信など、副作用を持つ処理を閉じ込める層。

3. ui / bootstrap
DOM 更新、イベント登録、画面初期化を担当する層。

この分離により、テスト容易性を確保しつつ、UI とロジックの責務を明確にできます。


## 5. 推奨ディレクトリ構成

以下のような構成を推奨します。

```text
.
├── app.py
├── architecture.md
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── app.js
│       ├── domain/
│       │   ├── timer.js
│       │   └── stats.js
│       ├── services/
│       │   ├── clock.js
│       │   └── storage.js
│       └── ui/
│           └── render.js
└── tests/
    ├── python/
    └── js/
```

各ファイルの責務は以下の通りです。

- [app.py](app.py)
  Flask アプリの起点。初期画面ルーティングや将来の API 追加先。

- templates/index.html
  単一画面の UI テンプレート。タイマー、操作ボタン、統計カードを配置。

- static/css/main.css
  モックに沿ったレイアウト、配色、リングの見た目、レスポンシブ対応。

- static/js/app.js
  アプリの起動処理。依存の組み立て、イベント接続、初回描画。

- static/js/domain/timer.js
  タイマー状態遷移と時間計算のコアロジック。

- static/js/domain/stats.js
  今日の完了回数、集中時間、日付切り替え時の統計処理。

- static/js/services/clock.js
  現在時刻の取得抽象化。テスト時に差し替え可能にする。

- static/js/services/storage.js
  localStorage の読み書きを集約する。

- static/js/ui/render.js
  state を受け取って DOM を更新する描画処理。


## 6. 状態設計

タイマーは単一の state オブジェクトで管理します。

想定する主な状態は以下です。

- mode
  focus / short_break / long_break

- status
  idle / running / paused

- durations
  各モードの秒数

- remainingSeconds
  現在の残り秒数

- endAt
  実行中の終了予定時刻

- completedPomodorosToday
  当日完了したポモドーロ回数

- focusedSecondsToday
  当日の集中時間合計

- lastUpdatedDate
  日付切り替え判定用の基準日

重要なのは、remainingSeconds を単純に 1 秒ずつ減算するのではなく、endAt と現在時刻の差分から再計算することです。

この設計により、以下の問題を減らせます。

- タブ非アクティブ時のタイマーずれ
- 再描画遅延による誤差
- リロード復元時の整合性の崩れ


## 7. タイマー制御の設計

タイマーのコアロジックは pure function 中心で構築します。

例として、以下のような関数群を想定します。

- createInitialState
- startTimer
- pauseTimer
- resetTimer
- tick
- completeSession
- getProgress
- formatTime

これらは原則として、入力として state と currentTime を受け取り、次の state や表示値を返す形にします。

これにより、DOM や localStorage がなくてもユニットテストできます。


## 8. UI 設計

UI は以下の 4 ブロックで構成します。

1. ヘッダー
アプリ名とウィンドウ風コントロールの表示。

2. タイマー表示
現在モード、円形プログレス、残り時間の表示。

3. 操作ボタン
開始、一時停止、リセット、必要ならモード切り替え。

4. 今日の進捗カード
完了回数と集中時間の表示。

描画ロジックは render(state) に集約し、状態の変化に応じて以下を更新します。

- タイマーの表示文字列
- 円形リングの進捗率
- ボタンの有効 / 無効状態
- モード表示
- 当日統計表示

円形プログレスは CSS の conic-gradient でも SVG でも実装可能ですが、初期段階では実装コストの低い方法を採用し、必要なら後で差し替え可能にします。


## 9. 永続化方針

### 9.1 初期段階

まずは localStorage を採用します。

保存対象の例:

- 現在のタイマー状態
- 当日の完了回数
- 当日の集中時間
- ユーザー設定値

この段階の利点は以下です。

- サーバーサイドの実装を増やさずに済む
- リロード後の復元が可能
- 単一ユーザー用途では十分実用的


### 9.2 将来拡張

必要に応じて Flask API と SQLite を追加します。

用途の例:

- 日次実績の永続化
- 複数日履歴の表示
- 設定保存の安定化
- 将来的なユーザー管理や同期

ただし、初版で必須ではありません。まずは localStorage で完成度を上げる方が合理的です。


## 10. テスト容易性を高めるための設計上の追加ポイント

今回のアーキテクチャでは、ユニットテストしやすさを重視して以下を明示的に採用します。

### 10.1 時刻取得の抽象化

Date.now をロジックで直接呼ばず、clock サービス経由で取得します。

これにより、テストでは固定時刻を注入できます。


### 10.2 localStorage の直接参照を禁止

localStorage へのアクセスは storage サービスに集約します。

これにより、テストではメモリ上の偽実装に差し替えられます。


### 10.3 DOM 更新を描画層に閉じ込める

DOM 操作は ui/render.js に限定し、domain ロジックから document 参照を排除します。

これにより、ロジックの単体テストが容易になります。


### 10.4 イベント登録と依存組み立てを app.js に集約

クリックイベント、interval 開始、初期化処理などは app.js の責務とし、domain ロジックに混ぜません。


### 10.5 state を単一オブジェクトで扱う

グローバル変数を分散させず、state を一つのまとまりとして扱います。

これにより、初期化、保存、比較、テストデータ作成が簡単になります。


## 11. Flask 側のテストしやすい構成

Flask 側は薄く保ちますが、以下の構成を推奨します。

- app factory パターンを採用する
- create_app() でアプリ生成できるようにする
- 設定値を app.config に寄せる
- 将来的に永続化層を route から分離できるようにする

この構成により、テスト時に testing=True の Flask アプリを生成しやすくなります。


## 12. 想定するテスト戦略

### 12.1 JavaScript のユニットテスト

主対象:

- timer.js の状態遷移
- timer.js の進捗率計算
- stats.js の日次集計ロジック
- formatTime の表示整形

重点確認項目:

- 開始時に正しい endAt が設定されるか
- 一時停止で remainingSeconds が正しく固定されるか
- tick で完了判定が正しく行われるか
- 日付をまたいだときに統計がリセットされるか


### 12.2 UI の結合テスト

主対象:

- state を与えたときに表示が正しく更新されるか
- ボタン操作で期待する状態遷移が起きるか


### 12.3 Flask のルート / API テスト

主対象:

- GET / が正常に画面を返すか
- 将来の API が想定した JSON を返すか


## 13. 実装フェーズ案

### フェーズ 1

- Flask の土台を [app.py](app.py) に作る
- templates/index.html を追加する
- static/css/main.css を追加する
- タイマー UI を静的表示で再現する


### フェーズ 2

- domain/timer.js を実装する
- 開始、一時停止、リセットを実装する
- 円形プログレスと残り時間表示を動的に更新する


### フェーズ 3

- storage.js を実装する
- localStorage に状態と当日統計を保存する
- リロード復元を実装する


### フェーズ 4

- テストを追加する
- pure function のユニットテストを整備する
- Flask のルートテストを整備する


### フェーズ 5

- 必要であれば Flask API と SQLite を追加する
- 履歴管理や設定保存をサーバー側へ拡張する


## 14. 結論

本アプリに対して最も現実的で保守しやすい構成は、以下の方針です。

- Flask は薄いサーバーとして使う
- タイマーのコアロジックはクライアントサイドで実装する
- ロジックは pure function 中心に分離する
- 時刻取得、ストレージ、DOM 更新などの副作用は境界に閉じ込める
- 初版は localStorage 中心で構築し、必要に応じて API / DB を追加する

この方針により、実装スピード、保守性、将来拡張性、ユニットテスト容易性のバランスを取りやすくなります。
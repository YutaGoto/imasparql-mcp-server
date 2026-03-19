# IMAS MCP Adapter

imasparql (`https://sparql.crssnky.xyz/spql/imas/query`) を MCP として扱うためのアダプタ。

HTTPサーバーとしての利用と、Cursor等のMCPクライアントからの直接利用の両方に対応しています。

## インストール

```bash
pnpm install
```

## 使い方

### 1. stdio接続（Cursorなど）で利用

stdio接続に対応したMCPクライアント（例: Cursor）の設定ファイルに、このプロジェクトの `mcp-stdio.js` を実行するコマンドを登録します。
例えばCursorの場合は、クライアントの設定ファイルに以下のように追加します：

```json
{
  "mcpServers": {
    "imasparql": {
      "command": "node",
      "args": ["path/to/imasparql-mcp-server/mcp-stdio.js"]
    }
  }
}
```

または、プロジェクトをグローバルインストールした場合：

```bash
pnpm install -g .
```

```json
{
  "mcpServers": {
    "imasparql": {
      "command": "imasparql-mcp"
    }
  }
}
```

クライアントを再起動すると、アイドルマスターのキャラクター情報を検索・取得できるツールが利用可能になります。

#### 利用可能なツール

- `search_entities`: キャラクター検索（名前、ブランド、身長、体重、誕生日などで絞り込み可能）
    - `q`: 検索キーワード
    - `brand`: ブランド名（例: `765AS`, `CinderellaGirls`）
    - `minHeight` / `maxHeight`: 身長範囲 (cm)
    - `minWeight` / `maxWeight`: 体重範囲 (kg)
    - `birthMonth`: 誕生月 (1-12)
    - `birthDay`: 誕生日 (1-31)
    - `birthDateFrom`: 開始日 (`MM-DD` 形式、例: `02-19`)
    - `birthDateTo`: 終了日 (`MM-DD` 形式、例: `02-28`)
    - `sortBy`: ソート項目 (`name`, `height`, `weight`, `birthDate`)
    - `sortOrder`: ソート順 (`asc`, `desc`)
    - ※ imasparqlには誕生日の「年」の情報がないため、日付指定は `MM-DD` 形式で行います。
    - ※ `birthDateFrom` と `birthDateTo` を組み合わせて「来週が誕生日のアイドル」といった期間検索が可能です（年を跨ぐ指定にも対応しています）。
- `get_entity`: 基本情報取得
- `get_entity_details`: 詳細情報取得
- `get_entity_relations`: 関連情報（所属ユニットなど）取得
- `get_unit_members`: ユニットに所属するメンバー（アイドル）を取得
- `get_unit_members_by_name`: ユニット名から所属メンバーを取得
- `search_clothes`: 衣装検索
- `get_idol_clothes`: 特定のアイドルの衣装一覧取得

### 2. HTTPサーバーとして利用

#### 開発環境

```bash
pnpm dev
```

#### 本番環境

```bash
pnpm start
```

`http://localhost:3000/mcp` にアクセスして動作確認。

#### Docker イメージのビルドと実行

```bash
docker build -t imas-mcp .
docker run -p 3000:3000 imas-mcp
```

## API例（HTTPサーバー）

### エンティティ検索

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_entities",
    "params": { "q": "春香" }
  }'
```

### エンティティ詳細取得

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "get_entity",
    "params": { "uri": "https://sparql.crssnky.xyz/imasrdf/RDFs/detail/天海春香" }
  }'
```

## 技術スタック

- Node.js (ES Modules)
- Express (HTTPサーバー)
- @modelcontextprotocol/sdk (MCP stdio通信)
- imasparql SPARQL エンドポイント

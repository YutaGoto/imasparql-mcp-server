#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getEntity,
  getEntityDetails,
  getEntityRelations,
  getUnitMembers,
  getUnitMembersByName,
  searchEntities,
} from "./lib/queries.js";

// MCPサーバーインスタンスを作成
const server = new Server(
  {
    name: "imasparql-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ツール一覧を返すハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_entities",
        description:
          "アイドルマスターのキャラクター（アイドル・スタッフ）を検索します。名前、ブランド、身長、体重などで絞り込み可能です。",
        inputSchema: {
          type: "object",
          properties: {
            q: {
              type: "string",
              description: "検索キーワード（名前、読み仮名など）",
            },
            brand: {
              type: "string",
              description:
                "ブランド名で絞り込み（例: 765AS, CinderellaGirls, MillionLive, など）",
            },
            minHeight: {
              type: "number",
              description: "最小身長（cm）",
            },
            maxHeight: {
              type: "number",
              description: "最大身長（cm）",
            },
            minWeight: {
              type: "number",
              description: "最小体重（kg）",
            },
            maxWeight: {
              type: "number",
              description: "最大体重（kg）",
            },
            sortBy: {
              type: "string",
              enum: ["name", "height", "weight", "birthDate"],
              description: "ソート項目",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "ソート順（昇順/降順）",
            },
            limit: {
              type: "number",
              description: "取得件数の上限（デフォルト: 50）",
              default: 50,
            },
            offset: {
              type: "number",
              description: "オフセット（デフォルト: 0）",
              default: 0,
            },
          },
        },
      },
      {
        name: "get_entity",
        description:
          "指定されたURIのエンティティ（キャラクター）の基本情報を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            uri: {
              type: "string",
              description: "エンティティのURI",
            },
          },
          required: ["uri"],
        },
      },
      {
        name: "get_entity_details",
        description: "エンティティの詳細情報を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "エンティティのURI",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_entity_relations",
        description: "エンティティの関連情報（所属ユニットなど）を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "エンティティのURI",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_unit_members",
        description: "ユニットに所属するメンバー（アイドル）を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ユニットのURI",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_unit_members_by_name",
        description:
          "指定したユニット名に所属するアイドルの一覧を取得します。部分一致や英語表記も対応しています。",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "ユニット名（部分一致可）",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

// ツール呼び出しハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_entities": {
        const results = await searchEntities(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_entity": {
        const result = await getEntity(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_entity_details": {
        const result = await getEntityDetails(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_entity_relations": {
        const result = await getEntityRelations(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_unit_members": {
        const result = await getUnitMembers(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_unit_members_by_name": {
        const result = await getUnitMembersByName(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IMAS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

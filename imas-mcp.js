import express from "express";
import {
  getEntity,
  getEntityDetails,
  getEntityRelations,
  getUnitMembers,
  getUnitMembersByName,
  searchEntities,
} from "./lib/queries.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- MCP methods ----
app.post("/mcp", async (req, res) => {
  const { id, method, params } = req.body;

  try {
    if (method === "search_entities") {
      const items = await searchEntities(params);
      return res.json({ jsonrpc: "2.0", id, result: items });
    }

    if (method === "get_entity") {
      const result = await getEntity(params);
      return res.json({ jsonrpc: "2.0", id, result });
    }

    if (method === "get_entity_details") {
      const result = await getEntityDetails(params);
      return res.json({ jsonrpc: "2.0", id, result });
    }

    if (method === "get_entity_relations") {
      const results = await getEntityRelations(params);
      return res.json({ jsonrpc: "2.0", id, result: results });
    }

    if (method === "get_unit_members") {
      const members = await getUnitMembers(params);

      return res.json({
        jsonrpc: "2.0",
        id,
        result: members,
      });
    }

    if (method === "get_unit_members_by_name") {
      const members = await getUnitMembersByName(params);

      return res.json({
        jsonrpc: "2.0",
        id,
        result: members,
      });
    }

    return res.status(400).json({ error: "Unsupported method" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ jsonrpc: "2.0", id, error: e.message });
  }
});

app.listen(PORT, () => console.log(`IMAS MCP server running on :${PORT}`));

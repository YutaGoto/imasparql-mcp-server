const SPARQL_ENDPOINT = "https://sparql.crssnky.xyz/spql/imas/query";

// ---- Helper ----
async function querySparql(sparql, accept = "application/sparql-results+json") {
  const resp = await fetch(
    `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}`,
    {
      headers: { Accept: accept },
    },
  );
  if (!resp.ok) throw new Error(`SPARQL error ${resp.status}`);
  return accept.includes("json") ? resp.json() : resp.text();
}

function escapeSparql(s) {
  return s.replace(/["\\]/g, "\\$&");
}

// ---- MCP methods ----
export async function searchEntities(params) {
  const q = params?.q || "";
  const brand = params?.brand;
  const minHeight = params?.minHeight;
  const maxHeight = params?.maxHeight;
  const minWeight = params?.minWeight;
  const maxWeight = params?.maxWeight;
  const sortBy = params?.sortBy;
  const sortOrder = (params?.sortOrder ?? "asc").toUpperCase();
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const sortMap = {
    name: "?label",
    height: "?height",
    weight: "?weight",
    birthDate: "?birthDate",
  };

  let sortExpr = "";
  if (sortBy && sortMap[sortBy]) {
    const field = sortMap[sortBy];
    if (sortBy === "height" || sortBy === "weight") {
      // 数値ソート
      sortExpr = `${
        sortOrder === "DESC" ? "DESC" : "ASC"
      }(xsd:integer(${field}))`;
    } else {
      // 文字列や日付はそのまま
      sortExpr = `${sortOrder === "DESC" ? "DESC" : "ASC"}(${field})`;
    }
  }

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX schema: <http://schema.org/>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT DISTINCT ?s ?label ?sname ?kana ?brand ?height ?weight ?birthDate
    WHERE {
      ?s rdfs:label ?label .
      ?s rdf:type ?type .
      ?s a imas:Idol .
      OPTIONAL { ?s schema:name ?sname }
      OPTIONAL { ?s imas:nameKana ?kana }
      OPTIONAL { ?s imas:Brand ?brand }
      OPTIONAL { ?s schema:height ?height }
      OPTIONAL { ?s schema:weight ?weight }
      OPTIONAL { ?s schema:birthDate ?birthDate }

      FILTER (
        regex(str(?type), 'Idol$|Staff$') &&
        CONTAINS(LCASE(STR(?label)), LCASE("${escapeSparql(q)}")) ||
        CONTAINS(LCASE(STR(?sname)), LCASE("${escapeSparql(q)}")) ||
        CONTAINS(LCASE(STR(?kana)), LCASE("${escapeSparql(q)}"))
      )

      ${brand ? `FILTER(STR(?brand) = "${escapeSparql(brand)}")` : ""}
      ${minHeight ? `FILTER(xsd:integer(?height) >= ${minHeight})` : ""}
      ${maxHeight ? `FILTER(xsd:integer(?height) <= ${maxHeight})` : ""}
      ${minWeight ? `FILTER(xsd:integer(?weight) >= ${minWeight})` : ""}
      ${maxWeight ? `FILTER(xsd:integer(?weight) <= ${maxWeight})` : ""}
    }
    ${sortExpr ? `ORDER BY ${sortExpr}` : ""}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const result = await querySparql(sparql);
  const items = result.results.bindings.map((b) => ({
    id: b.s.value,
    title: b.label?.value || b.sname?.value || "(no name)",
    snippet: [
      b.label?.value,
      b.sname?.value,
      b.kana?.value,
      b.brand?.value,
      b.height ? `身長:${b.height.value}` : "",
      b.weight ? `体重:${b.weight.value}` : "",
      b.birthDate ? `誕生日:${b.birthDate.value}` : "",
    ]
      .filter(Boolean)
      .join(" / "),
  }));
  return items;
}

export async function getEntity(params) {
  const uri = params?.uri;
  if (!uri) throw new Error("Missing uri");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>
    PREFIX schema: <http://schema.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>

    SELECT ?label ?type ?nameKana ?name ?height ?weight ?gender ?age ?blood ?brand ?bust ?waist ?hip ?handedness ?hobby ?birthPlace ?birthDate ?constellation ?grade ?color ?cv ?whose ?description
    WHERE {
      VALUES ?s { <${uri}> }
      OPTIONAL { ?s rdfs:label ?label }
      OPTIONAL { ?s rdf:type ?type }
      OPTIONAL { ?s imas:nameKana ?nameKana }
      OPTIONAL { ?s schema:name ?name }
      OPTIONAL { ?s schema:height ?height }
      OPTIONAL { ?s schema:weight ?weight }
      OPTIONAL { ?s schema:gender ?gender }
      OPTIONAL { ?s foaf:age ?age }
      OPTIONAL { ?s imas:BloodType ?blood }
      OPTIONAL { ?s imas:Brand ?brand }
      OPTIONAL { ?s imas:Bust ?bust }
      OPTIONAL { ?s imas:Waist ?waist }
      OPTIONAL { ?s imas:Hip ?hip }
      OPTIONAL { ?s imas:Handedness ?handedness }
      OPTIONAL { ?s imas:Hobby ?hobby }
      OPTIONAL { ?s schema:birthPlace ?birthPlace }
      OPTIONAL { ?s schema:birthDate ?birthDate }
      OPTIONAL { ?s imas:Constellation ?constellation }
      OPTIONAL { ?s imas:SchoolGrade ?grade }
      OPTIONAL { ?s imas:Color ?color }
      OPTIONAL { ?s imas:cv ?cv }
      OPTIONAL { ?s imas:Whose ?whose }
      OPTIONAL { ?s schema:description ?description }
    }
  `;
  const result = await querySparql(sparql);
  const row = result.results.bindings[0] || {};
  const metadata = {};
  for (const [k, v] of Object.entries(row)) metadata[k] = v.value;

  const context = {
    id: uri,
    title: row.label?.value || "(no label)",
    text: `${row.label?.value || ""} (${row.nameKana?.value || ""})`,
    metadata,
  };

  return { context: [context] };
}

export async function getEntityDetails(params) {
  const uri = params?.id;
  if (!uri) throw new Error("Missing id");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX schema: <http://schema.org/>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>

    SELECT ?p ?o WHERE {
      VALUES ?p {
        rdfs:label
        imas:nameKana
        schema:height schema:weight schema:gender
        foaf:age
        imas:BloodType imas:Brand
        imas:Bust imas:Waist imas:Hip
        imas:Handedness imas:Hobby
        schema:birthPlace schema:birthDate
        imas:Constellation imas:SchoolGrade imas:Color
        imas:cv
        imas:Whose schema:description schema:name
      }
      <${uri}> ?p ?o .
    }
  `;

  const result = await querySparql(sparql);

  // ---- マッピング定義 ----
  const propLabels = {
    "rdfs:label": "name",
    "imas:nameKana": "kana",
    "schema:height": "height",
    "schema:weight": "weight",
    "schema:gender": "gender",
    "foaf:age": "age",
    "imas:BloodType": "bloodType",
    "imas:Brand": "brand",
    "imas:Bust": "bust",
    "imas:Waist": "waist",
    "imas:Hip": "hip",
    "imas:Handedness": "handedness",
    "imas:Hobby": "hobby",
    "schema:birthPlace": "birthPlace",
    "schema:birthDate": "birthDate",
    "imas:Constellation": "constellation",
    "imas:SchoolGrade": "schoolGrade",
    "imas:Color": "color",
    "imas:cv": "cv",
    "imas:Whose": "whose",
    "schema:description": "description",
    "schema:name": "name",
  };

  // ---- 整形処理 ----
  const data = {};
  result.results.bindings.forEach((b) => {
    const p = b.p.value;
    const o = b.o.value;
    const key =
      Object.entries(propLabels).find(([ns]) =>
        p.endsWith(ns.split(":")[1]),
      )?.[1] || p;
    if (!data[key]) data[key] = [];
    data[key].push(o);
  });

  // 単一要素の配列はスカラーに変換
  for (const key in data) {
    if (data[key].length === 1) data[key] = data[key][0];
  }

  return data;
}

export async function getEntityRelations(params) {
  const uri = params?.id;
  if (!uri) throw new Error("Missing id");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT DISTINCT ?unit ?unitLabel
    WHERE {
      <${uri}> <http://schema.org/memberOf> ?unit .
      OPTIONAL { ?unit rdfs:label ?unitLabel . }
    }
  `;

  const result = await querySparql(sparql);

  const results = [];
  result.results.bindings.forEach((b) => {
    const unit = b.unit.value;
    const label = b.unitLabel?.value || "(no label)";
    results.push({ id: unit, name: label });
  });

  return results;
}

export async function getUnitMembers(params) {
  const uri = params?.id;
  if (!uri) throw new Error("Missing id");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX schema: <http://schema.org/>

    SELECT DISTINCT ?member ?memberLabel
    WHERE {
      ?member schema:memberOf <${uri}> .
      ?member rdfs:label ?memberLabel .
      ?member a <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#Idol> .
    }
  `;

  const result = await querySparql(sparql);
  const members = result.results.bindings.map((b) => ({
    id: b.member.value,
    name: b.memberLabel.value,
  }));

  return members;
}

export async function getUnitMembersByName(params) {
  const name = params?.name;
  if (!name) throw new Error("Missing name");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX schema: <http://schema.org/>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>

    SELECT DISTINCT ?member ?memberLabel ?unit ?unitLabel
    WHERE {
      ?unit a imas:Unit ;
            rdfs:label ?unitLabel .
      FILTER (
        CONTAINS(LCASE(STR(?unitLabel)), LCASE("${escapeSparql(name)}"))
      )
      ?member schema:memberOf ?unit ;
              rdfs:label ?memberLabel ;
              a imas:Idol .
    }
  `;

  const result = await querySparql(sparql);
  const members = result.results.bindings.map((b) => ({
    unit: b.unitLabel.value,
    id: b.member.value,
    name: b.memberLabel.value,
  }));

  return members;
}

export async function searchClothes(params) {
  const q = params?.q || "";
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>
    PREFIX schema: <http://schema.org/>

    SELECT DISTINCT ?s ?label ?description ?whose
    WHERE {
      ?s a imas:Clothes ;
         rdfs:label ?label .
      OPTIONAL { ?s schema:description ?description }
      OPTIONAL { ?s imas:Whose ?whose }
      FILTER (
        CONTAINS(LCASE(STR(?label)), LCASE("${escapeSparql(q)}")) ||
        CONTAINS(LCASE(STR(?description)), LCASE("${escapeSparql(q)}"))
      )
    }
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const result = await querySparql(sparql);
  return result.results.bindings.map((b) => ({
    id: b.s?.value,
    title: b.label?.value || "(no name)",
    snippet: [
      b.description?.value,
      b.whose ? `所有者: ${b.whose.value.split("/").pop()}` : "",
    ]
      .filter(Boolean)
      .join(" / "),
  }));
}

export async function getIdolClothes(params) {
  const idolUri = params?.id;
  if (!idolUri) throw new Error("Missing id (idol URI)");

  const sparql = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>
    PREFIX schema: <http://schema.org/>

    SELECT DISTINCT ?s ?label ?description
    WHERE {
      ?s a imas:Clothes ;
         imas:Whose <${idolUri}> ;
         rdfs:label ?label .
      OPTIONAL { ?s schema:description ?description }
    }
  `;

  const result = await querySparql(sparql);
  return result.results.bindings.map((b) => ({
    id: b.s?.value,
    name: b.label?.value || "(no name)",
    description: b.description?.value || "",
  }));
}

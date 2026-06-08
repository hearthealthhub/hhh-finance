export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "AI extraction is not configured yet. Add OPENAI_API_KEY in Netlify environment variables." }, 500);
  }

  try {
    const { imageDataUrl, products = [], today = "" } = await request.json();
    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return json({ error: "Please upload a valid image." }, 400);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Extract order details from an image for Heart Health Hub. Return JSON only. Use null for missing values. Match products to the supplied catalog when obvious, but do not invent details."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Today is ${today}. Product catalog: ${JSON.stringify(products.slice(0, 80))}`
              },
              {
                type: "input_image",
                image_url: imageDataUrl
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "order_extraction",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["customerName", "customerContact", "orderDate", "items", "discountType", "discountValue", "deliveryFee", "deliveryCost", "paymentStatus", "notes"],
              properties: {
                customerName: { anyOf: [{ type: "string" }, { type: "null" }] },
                customerContact: { anyOf: [{ type: "string" }, { type: "null" }] },
                orderDate: { anyOf: [{ type: "string" }, { type: "null" }] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "qty", "price", "cost"],
                    properties: {
                      name: { type: "string" },
                      qty: { type: "number" },
                      price: { anyOf: [{ type: "number" }, { type: "null" }] },
                      cost: { anyOf: [{ type: "number" }, { type: "null" }] }
                    }
                  }
                },
                discountType: { enum: ["flat", "percent", null] },
                discountValue: { anyOf: [{ type: "number" }, { type: "null" }] },
                deliveryFee: { anyOf: [{ type: "number" }, { type: "null" }] },
                deliveryCost: { anyOf: [{ type: "number" }, { type: "null" }] },
                paymentStatus: { enum: ["paid", "pending", "partial", null] },
                notes: { anyOf: [{ type: "string" }, { type: "null" }] }
              }
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json({ error: data.error?.message || "OpenAI extraction failed." }, response.status);
    }

    const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((content) => content.text)?.text;
    if (!text) return json({ error: "No extraction result was returned." }, 502);

    return json(JSON.parse(text));
  } catch (error) {
    return json({ error: error.message || "Could not extract order details." }, 500);
  }
};

export const config = {
  path: "/api/extract-order"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

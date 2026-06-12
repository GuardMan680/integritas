import { ApolloServer } from "@apollo/server"; 
import { startStandaloneServer } from "@apollo/server/standalone"; 
 
const PORT = Number(process.env.PORT || 4000); 
 
const PRODUCT_SERVICE_URL = 
  process.env.PRODUCT_SERVICE_URL || "http://product-service:3001"; 
 
const ORDER_SERVICE_URL = 
  process.env.ORDER_SERVICE_URL || "http://order-service:3002"; 
 
const PYTHON_SERVICE_URL = 
  process.env.PYTHON_SERVICE_URL || "http://python-service:5000"; 
 
const LARAVEL_SERVICE_URL = 
  process.env.LARAVEL_SERVICE_URL || "http://laravel-service:8000"; 
 
async function fetchJson(url, options = {}) { 
  const response = await fetch(url, { 
    headers: { 
      "Content-Type": "application/json", 
      ...(options.headers || {}) 
    }, 
    ...options 
  }); 
 
  const data = await response.json(); 
 
  if (!response.ok) { 
    throw new Error(data.message || "Request ke service gagal"); 
  } 
 
  return data; 
} 
 
function normalizeOrder(order) { 
  return { 
    id: String(order._id || order.id || order.order_id || ""), 
    customer_name: order.customer_name || order.customer || "", 
    product_id: order.product_id || (order.product && order.product.id) || null, 
    quantity: order.quantity || 0, 
    product_snapshot: order.product_snapshot || order.product || null, 
    total_price: order.total_price || 0, 
    status: order.status || "pending", 
    createdAt: order.createdAt || null, 
    updatedAt: order.updatedAt || null 
  }; 
} 
 
const typeDefs = `#graphql 
  type Product { 
    id: ID! 
    name: String 
    price: Int 
  } 
 
  type ProductSnapshot { 
    id: Int 
    name: String 
    price: Int 
  } 
 
  type Order { 
    id: ID! 
    customer_name: String 
    product_id: Int 
    quantity: Int 
    product_snapshot: ProductSnapshot 
    product: Product 
    total_price: Int 
    status: String 
    createdAt: String 
    updatedAt: String 
  } 
 
  type Analytics { 
    id: ID! 
    metric_name: String 
    metric_value: Int 
    description: String 
  } 
 
  type Report { 
    total_report: Int 
    report_type: String 
    generated_by: String 
  } 
 
  type ServiceHealth { 
    service: String 
    language: String 
    framework: String 
    database: String 
    status: String 
  } 
 
  type SystemStatus { 
    product_service: ServiceHealth 
    order_service: ServiceHealth 
    python_service: ServiceHealth 
    laravel_service: ServiceHealth 
  } 
 
  type Query { 
    products: [Product] 
    product(id: ID!): Product 
 
    orders: [Order] 
    order(id: ID!): Order 
 
    analytics: [Analytics] 
    report: Report 
 
    systemStatus: SystemStatus 
  } 
 
  type Mutation { 
    createProduct(name: String!, price: Int!): Product 
    createOrder(customer_name: String!, product_id: Int!, quantity: Int!): Order 
    createAnalytics(metric_name: String!, metric_value: Int!, description: String): Analytics 
    updateOrderStatus(id: ID!, status: String!): Order 
    deleteOrder(id: ID!): Boolean 
  } 
`; 
 
const resolvers = { 
  Query: { 
    products: async () => { 
      const result = await fetchJson(`${PRODUCT_SERVICE_URL}/products`); 
      return result.data; 
    }, 
 
    product: async (_, { id }) => { 
      const result = await fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`); 
      return result.data; 
    }, 
 
    orders: async () => { 
      const result = await fetchJson(`${ORDER_SERVICE_URL}/orders`); 
      return result.data.map(normalizeOrder).filter(o => o.id); 
    }, 
 
    order: async (_, { id }) => { 
      const result = await fetchJson(`${ORDER_SERVICE_URL}/orders/${id}`); 
      return normalizeOrder(result.data); 
    }, 
 
    analytics: async () => { 
      const result = await fetchJson(`${PYTHON_SERVICE_URL}/analytics`); 
      return result.data; 
    }, 
 
    report: async () => { 
      const result = await fetchJson(`${LARAVEL_SERVICE_URL}/report`); 
      return result.data; 
    }, 
 
    systemStatus: async () => { 
      const [ 
        productHealth, 
        orderHealth, 
        pythonHealth, 
        laravelHealth 
      ] = await Promise.all([ 
        fetchJson(`${PRODUCT_SERVICE_URL}/health`), 
        fetchJson(`${ORDER_SERVICE_URL}/health`), 
        fetchJson(`${PYTHON_SERVICE_URL}/health`), 
        fetchJson(`${LARAVEL_SERVICE_URL}/health`) 
      ]); 
 
      return { 
        product_service: productHealth, 
        order_service: orderHealth, 
        python_service: pythonHealth, 
        laravel_service: laravelHealth 
      }; 
    } 
  }, 
 
  Order: { 
    product: async (order) => { 
      if (!order.product_id) { 
        return null; 
      } 
 
      const result = await fetchJson( 
        `${PRODUCT_SERVICE_URL}/products/${order.product_id}` 
      ); 
 
      return result.data; 
    } 
  }, 
 
  Mutation: { 
    createProduct: async (_, { name, price }) => { 
      const result = await fetchJson(`${PRODUCT_SERVICE_URL}/products`, { 
        method: "POST", 
        body: JSON.stringify({ name, price }) 
      }); 
 
      return result.data; 
    }, 
 
    createOrder: async (_, { customer_name, product_id, quantity }) => { 
      const result = await fetchJson(`${ORDER_SERVICE_URL}/orders`, { 
        method: "POST", 
        body: JSON.stringify({ 
          customer_name, 
          product_id, 
          quantity 
        } || {}) 
      }); 
 
      return normalizeOrder(result.data); 
    }, 
 
    createAnalytics: async (_, { metric_name, metric_value, description }) => { 
      const result = await fetchJson(`${PYTHON_SERVICE_URL}/analytics`, { 
        method: "POST", 
        body: JSON.stringify({ 
          metric_name, 
          metric_value, 
          description 
        }) 
      }); 
 
      return result.data; 
    }, 
 
    updateOrderStatus: async (_, { id, status }) => { 
      const result = await fetchJson(`${ORDER_SERVICE_URL}/orders/${id}/status`, { 
        method: "PUT", 
        body: JSON.stringify({ status }) 
      }); 
 
      return normalizeOrder(result.data); 
    }, 
 
    deleteOrder: async (_, { id }) => { 
      await fetchJson(`${ORDER_SERVICE_URL}/orders/${id}`, { 
        method: "DELETE" 
      }); 
 
      return true; 
    } 
  } 
}; 
 
const server = new ApolloServer({ 
  typeDefs, 
  resolvers 
}); 
 
const { url } = await startStandaloneServer(server, { 
  listen: { 
    host: "0.0.0.0", 
    port: PORT 
  } 
}); 
 
console.log(`GraphQL Gateway berjalan pada ${url}`);

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const PORT = Number(process.env.PORT || 4000);

const FIELD_SERVICE_URL        = process.env.FIELD_SERVICE_URL        || "http://field-service:3001";
const BOOKING_SERVICE_URL      = process.env.BOOKING_SERVICE_URL      || "http://booking-service:3002";
const PAYMENT_SERVICE_URL      = process.env.PAYMENT_SERVICE_URL      || "http://payment-service:3003";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3004";
const REPORT_SERVICE_URL       = process.env.REPORT_SERVICE_URL       || "http://report-service:8000";

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
    throw new Error(data.message || data.error || "Request ke service gagal");
  }

  return data;
}

const typeDefs = `#graphql
  type Field {
    id: ID!
    name: String
    type: String
    price_per_hour: Int
    is_available: Boolean
  }

  type Booking {
    id: ID!
    field_id: Int
    customer_name: String
    date: String
    start_time: String
    end_time: String
    total_price: Int
    status: String
  }

  type Payment {
    id: ID!
    booking_id: Int
    amount: Int
    method: String
    status: String
  }

  type Notification {
    id: ID!
    user_name: String
    message: String
    type: String
    is_read: Boolean
    created_at: String
  }

  type ServiceHealth {
    service: String
    status: String
  }

  type SystemStatus {
    field_service: ServiceHealth
    booking_service: ServiceHealth
    payment_service: ServiceHealth
    notification_service: ServiceHealth
    report_service: ServiceHealth
  }

  type Query {
    fields: [Field]
    field(id: ID!): Field

    bookings: [Booking]
    booking(id: ID!): Booking

    payments: [Payment]
    paymentByBooking(booking_id: ID!): Payment

    notifications: [Notification]
    notification(id: ID!): Notification
    notificationsByUser(user_name: String!): [Notification]

    systemStatus: SystemStatus
  }

  type Mutation {
    createField(name: String!, type: String!, price_per_hour: Int!): Field
    updateField(id: ID!, name: String, type: String, price_per_hour: Int, is_available: Boolean): Field
    deleteField(id: ID!): Boolean

    createBooking(field_id: Int!, customer_name: String!, date: String!, start_time: String!, end_time: String!): Booking
    updateBookingStatus(id: ID!, status: String!): Booking
    deleteBooking(id: ID!): Boolean

    createPayment(booking_id: Int!, amount: Int!, method: String!): Payment
    updatePaymentStatus(id: ID!, status: String!): Payment

    createNotification(user_name: String!, message: String!, type: String): Notification
    markNotificationRead(id: ID!): Notification
    deleteNotification(id: ID!): Boolean
  }
`;

const resolvers = {
  Query: {
    fields: async () => {
      const result = await fetchJson(`${FIELD_SERVICE_URL}/fields`);
      return result.data;
    },

    field: async (_, { id }) => {
      const result = await fetchJson(`${FIELD_SERVICE_URL}/fields/${id}`);
      return result.data;
    },

    bookings: async () => {
      const result = await fetchJson(`${BOOKING_SERVICE_URL}/bookings`);
      return result.data;
    },

    booking: async (_, { id }) => {
      const result = await fetchJson(`${BOOKING_SERVICE_URL}/bookings/${id}`);
      return result.data;
    },

    payments: async () => {
      const result = await fetchJson(`${PAYMENT_SERVICE_URL}/payments`);
      return result.data;
    },

    paymentByBooking: async (_, { booking_id }) => {
      const result = await fetchJson(`${PAYMENT_SERVICE_URL}/payments/booking/${booking_id}`);
      return result.data;
    },

    notifications: async () => {
      const result = await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications`);
      return result.data;
    },

    notification: async (_, { id }) => {
      const result = await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications/${id}`);
      return result.data;
    },

    notificationsByUser: async (_, { user_name }) => {
      const result = await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications/user/${user_name}`);
      return result.data;
    },

    systemStatus: async () => {
      const [fieldHealth, bookingHealth, paymentHealth, notifHealth, reportHealth] =
        await Promise.all([
          fetchJson(`${FIELD_SERVICE_URL}/health`),
          fetchJson(`${BOOKING_SERVICE_URL}/health`),
          fetchJson(`${PAYMENT_SERVICE_URL}/health`),
          fetchJson(`${NOTIFICATION_SERVICE_URL}/health`),
          fetchJson(`${REPORT_SERVICE_URL}/health`),
        ]);

      return {
        field_service:        fieldHealth,
        booking_service:      bookingHealth,
        payment_service:      paymentHealth,
        notification_service: notifHealth,
        report_service:       reportHealth,
      };
    },
  },

  Mutation: {
    createField: async (_, { name, type, price_per_hour }) => {
      const result = await fetchJson(`${FIELD_SERVICE_URL}/fields`, {
        method: "POST",
        body: JSON.stringify({ name, type, price_per_hour }),
      });
      return result.data;
    },

    updateField: async (_, { id, ...fields }) => {
      const result = await fetchJson(`${FIELD_SERVICE_URL}/fields/${id}`, {
        method: "PUT",
        body: JSON.stringify(fields),
      });
      return result.data;
    },

    deleteField: async (_, { id }) => {
      await fetchJson(`${FIELD_SERVICE_URL}/fields/${id}`, { method: "DELETE" });
      return true;
    },

    createBooking: async (_, { field_id, customer_name, date, start_time, end_time }) => {
      const result = await fetchJson(`${BOOKING_SERVICE_URL}/bookings`, {
        method: "POST",
        body: JSON.stringify({ field_id, customer_name, date, start_time, end_time }),
      });
      return result.data;
    },

    updateBookingStatus: async (_, { id, status }) => {
      const result = await fetchJson(`${BOOKING_SERVICE_URL}/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return result.data;
    },

    deleteBooking: async (_, { id }) => {
      await fetchJson(`${BOOKING_SERVICE_URL}/bookings/${id}`, { method: "DELETE" });
      return true;
    },

    createPayment: async (_, { booking_id, amount, method }) => {
      const result = await fetchJson(`${PAYMENT_SERVICE_URL}/payments`, {
        method: "POST",
        body: JSON.stringify({ booking_id, amount, method }),
      });
      return result.data;
    },

    updatePaymentStatus: async (_, { id, status }) => {
      const result = await fetchJson(`${PAYMENT_SERVICE_URL}/payments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return result.data;
    },

    createNotification: async (_, { user_name, message, type }) => {
      const result = await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications`, {
        method: "POST",
        body: JSON.stringify({ user_name, message, type }),
      });
      return result.data;
    },

    markNotificationRead: async (_, { id }) => {
      const result = await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications/${id}/read`, {
        method: "PUT",
      });
      return result.data;
    },

    deleteNotification: async (_, { id }) => {
      await fetchJson(`${NOTIFICATION_SERVICE_URL}/notifications/${id}`, { method: "DELETE" });
      return true;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { host: "0.0.0.0", port: PORT },
});

console.log(`GraphQL Gateway berjalan pada ${url}`);
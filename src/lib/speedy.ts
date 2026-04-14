const SPEEDY_BASE = "https://api.speedy.bg/v1";

function credentials() {
  return {
    userName: process.env.SPEEDY_USERNAME!,
    password: process.env.SPEEDY_PASSWORD!,
    language: "BG",
  };
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${SPEEDY_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ ...credentials(), ...body }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Speedy API ${path} → HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type SpeedyOffice = {
  id: number;
  name: string;
  address: {
    fullAddressString?: string;
    siteName?: string;
    siteId?: number;
    postCode?: string;
    streetName?: string;
    streetNo?: string;
    complexName?: string;
    blockNo?: string;
  };
  workingTimeSchedule?: unknown;
};

export type SpeedyShipmentInput = {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  deliveryMethod: "office" | "address";
  officeId?: number;
  siteId?: number;
  addressLine?: string;
  postCode?: string;
  weightKg: number;
};

// ─── Office search ───────────────────────────────────────────────────────────

type OfficeSearchResponse = {
  offices?: SpeedyOffice[];
  error?: { message: string };
};

export async function searchOffices(query: string): Promise<SpeedyOffice[]> {
  const data = await post<OfficeSearchResponse>("/location/office", {
    countryId: 100,
    ...(query.trim() ? { name: query.trim() } : {}),
  });

  return data.offices ?? [];
}

// ─── Price calculation ───────────────────────────────────────────────────────

type CalculateResponse = {
  calculations?: Array<{ price?: { total?: number; vat?: number } }>;
  error?: { message: string };
};

export async function calculatePrice(
  officeId: number,
  weightKg: number,
): Promise<number | null> {
  try {
    const clientId = Number(process.env.SPEEDY_CLIENT_ID);

    const data = await post<CalculateResponse>("/calculate", {
      sender: { clientId },
      recipient: {
        privatePerson: true,
        pickupOfficeId: officeId,
      },
      service: {
        autoAdjustPickupDate: true,
        serviceIds: [505],
      },
      content: {
        parcelsCount: 1,
        totalWeight: weightKg,
      },
      payment: {
        courierServicePayer: "RECIPIENT",
      },
    });

    return data.calculations?.[0]?.price?.total ?? null;
  } catch {
    return null;
  }
}

// ─── Create shipment ─────────────────────────────────────────────────────────

type ShipmentResponse = {
  id?: string;
  parcels?: Array<{ id: string }>;
  error?: { message: string };
};

export async function createShipment(input: SpeedyShipmentInput): Promise<{
  waybill: string | null;
  error: string | null;
}> {
  try {
    const recipient: Record<string, unknown> = {
      phone1: { number: input.recipientPhone.replace(/\s/g, "") },
      privatePerson: true,
      clientName: input.recipientName,
      ...(input.recipientEmail ? { email: input.recipientEmail } : {}),
    };

    if (input.deliveryMethod === "office" && input.officeId) {
      recipient.pickupOfficeId = input.officeId;
    } else {
      recipient.address = {
        countryId: 100,
        ...(input.siteId ? { siteId: input.siteId } : {}),
        ...(input.postCode ? { postCode: input.postCode } : {}),
        ...(input.addressLine ? { addressNote: input.addressLine } : {}),
      };
    }

    const data = await post<ShipmentResponse>("/shipment", {
      sender: {
        phone1: { number: process.env.SPEEDY_SENDER_PHONE },
        contactName: process.env.SPEEDY_SENDER_NAME,
        email: process.env.SPEEDY_SENDER_EMAIL,
      },
      recipient,
      service: {
        autoAdjustPickupDate: true,
        serviceId: 505,
      },
      content: {
        parcelsCount: 1,
        contents: "Козметични продукти",
        package: "BOX",
        totalWeight: input.weightKg,
      },
      payment: {
        courierServicePayer: "RECIPIENT",
      },
      ref1: input.orderId,
    });

    if (data.error) {
      return { waybill: null, error: data.error.message };
    }

    const waybill = data.parcels?.[0]?.id ?? data.id ?? null;
    return { waybill, error: null };
  } catch (err) {
    return { waybill: null, error: String(err) };
  }
}

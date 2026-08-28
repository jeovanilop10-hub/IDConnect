// These shapes are confirmed by decompiling the real
// xcp-card-services-java-rest-api-1.7.0.jar (CFR decompiler), not guessed.
// The identifying field is NOT always "id" — each model uses its own name
// (profileId, organizationId, deviceUniqueId, etc.) exactly as shown below.

export interface WithExtras {
  [key: string]: unknown;
}

export interface Address extends WithExtras {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Organization extends WithExtras {
  organizationId?: string;
  name?: string;
  accountNo?: string;
  businessAddress?: Address;
  billingAddress?: Address;
}

export interface OrganizationalUnit extends WithExtras {
  organizationId?: string;
  organizationUnitId?: string;
  name?: string;
  businessAddress?: Address;
  shippingAddress?: Address;
}

export interface Location extends WithExtras {
  organizationId?: string;
  organizationalUnitId?: string;
  organizationalUnitName?: string;
  locationId?: string;
  locationName?: string;
  businessAddress?: Address;
  shippingAddress?: Address;
}

export interface Device extends WithExtras {
  deviceUniqueId?: string;
  locationId?: string;
  deviceStatus?: string;
  errorMessage?: string;
  lastUpdate?: string;
  locationName?: string;
  deviceName?: string;
  deviceDescription?: string;
  deviceType?: string;
  deviceModel?: string;
  deviceManufacturer?: string;
  deviceSerialNumber?: string;
}

export interface PrintDestination extends WithExtras {
  organizationId?: string;
  organizationalUnitId?: string;
  locationId?: string;
  deviceId?: string;
  organizationName?: string;
  organizationalUnitName?: string;
  locationName?: string;
  deviceName?: string;
  printerName?: string;
  comment?: string;
  // Used as the identifier when calling other endpoints (e.g. destination
  // public key, or as a CardRequestService's "destination").
  destination?: string;
}

export interface PublicKeyCertificate extends WithExtras {
  subject?: string;
  certificate?: string;
  algorithms?: string[];
}

export type ParameterDataType = "Text" | "Integer" | "Date" | "List" | "Image";

export interface Validator extends WithExtras {
  type?: string;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface ProductionProfileParameter extends WithExtras {
  name?: string;
  dataType?: ParameterDataType;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  options?: string[];
  validatorList?: Validator[];
}

export interface ProductionProfile extends WithExtras {
  profileId?: string;
  name?: string;
  organizationId?: string;
  organizationName?: string;
}

export interface ProductionProfileConfigResponse extends WithExtras {
  profileId?: string;
  profileParameters?: ProductionProfileParameter[];
}

// Body sent to POST /production-profile
export interface ProductionProfileConfigRequest {
  profileId: string;
  profileParameters: ProductionProfileParameter[];
}

// Opaque — returned by POST /production-profile (configure) and re-submitted
// (after edits) to POST /job. Confirmed by decompiling the real SDK
// (com.extensia...model.service.ProductionRequestTemplate/CardRequestService/
// Parameter/BaseParameter) — note the per-parameter payload is nested under
// a "parameter" key (Parameter.data is @JsonProperty("parameter")), not "data".
export interface RequestParameterData extends WithExtras {
  dataType?: ParameterDataType;
  name?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  value?: string | number | null;
  validatorList?: Validator[];
  // Only present on List-type parameters.
  options?: string[];
}

export interface RequestParameter extends WithExtras {
  dataType?: ParameterDataType;
  securityDomain?: string | null;
  parameter?: RequestParameterData;
}

export interface CardRequestServiceData extends WithExtras {
  name?: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  version?: string;
  serviceOptions?: Record<string, string>;
  parameters?: RequestParameter[];
  requestTimeLimit?: number;
  destination?: string;
  requestName?: string;
  type?: string;
}

export interface ProductionRequestTemplate extends WithExtras {
  organizationId?: string;
  destination?: string;
  profileParameters?: Record<string, string>;
  services?: CardRequestServiceData[];
}

export interface JobResource extends WithExtras {
  resourceKey?: string;
  resourceType?: string;
  contentType?: string;
}

export interface Job extends WithExtras {
  deviceUniqueId?: string;
  locationUniqueId?: string;
  jobUniqueId?: string;
  jobName?: string;
  jobStatus?: string;
  jobStatusMessage?: string;
  jobDeletionRequested?: boolean;
  jobDeletionMessage?: string;
  submitDate?: string;
  lastUpdate?: string;
  jobResources?: JobResource[];
}

export interface JobImageResource extends WithExtras {
  jobUniqueId?: string;
  resourceKey?: string;
  imageType?: string;
  imageData?: string;
}

export interface ApiError {
  status?: string;
  message?: string;
}

export type Role = "ADMIN" | "OPERATOR" | "CLIENT" | "OPERATIONAL";

export interface AuthUser {
  username: string;
  role: Role;
  organizationId?: string | null;
}

export interface LoginResponse extends AuthUser {
  token: string;
}

export interface PortalUser {
  id: number;
  username: string;
  role: Role;
  organizationId?: string | null;
  enabled: boolean;
  // Only meaningful for role === "OPERATIONAL" — the flow ids this user was granted.
  flowIds?: number[];
}

export type FlowStepType = "INFO" | "PHOTO" | "FIELDS";

export interface FlowStep {
  id: string;
  type: FlowStepType;
  title: string;
  instructions?: string;
  parameterNames?: string[];
}

// Colors applied only to this flow's public kiosk screen — everything else
// in the app keeps the default look regardless of what a flow sets here.
export interface FlowTheme {
  primaryColor?: string | null;
  backgroundColor?: string | null;
  logoText?: string | null;
}

export interface FlowDefinition {
  id?: number;
  profileId: string;
  name: string;
  steps: FlowStep[];
  // Profile-config values the admin resolved once while building the flow
  // (e.g. a required parameter with no default) — the end CLIENT never
  // sees or fills these in.
  profileParameterValues?: Record<string, string>;
  // Name of a request-template parameter (e.g. an employee ID/SOEID field)
  // whose captured value becomes the job's requestName. Falls back to an
  // auto-generated name if unset.
  requestNameField?: string | null;
  // When true, this flow is reachable unauthenticated at /captura/{publicSlug}.
  // Print destination the admin picked for this flow — the end CLIENT
  // never sees this, it's applied automatically server-side.
  destination?: string | null;
  publicEnabled?: boolean;
  publicSlug?: string | null;
  theme?: FlowTheme | null;
  // When true, the kiosk asks for this ID before its steps and pre-fills
  // any FIELDS step whose parameter name matches an uploaded CSV column.
  identifierEnabled?: boolean;
  // Prompt shown on the kiosk's identifier screen, e.g. "Número de empleado".
  identifierLabel?: string | null;
}

export interface PreloadedDataInfo {
  recordCount: number;
  columns: string[];
}

// One row of an uploaded "pending jobs" CSV for a flow — worked through one
// at a time and removed once a job is submitted from it.
export interface PendingJobItem {
  id: number;
  values: Record<string, string>;
}

// What the unauthenticated /captura/{slug} screen is allowed to see.
export interface PublicFlow {
  name: string;
  steps: FlowStep[];
  theme?: FlowTheme | null;
  requestNameField?: string | null;
  identifierEnabled?: boolean;
  identifierLabel?: string | null;
}

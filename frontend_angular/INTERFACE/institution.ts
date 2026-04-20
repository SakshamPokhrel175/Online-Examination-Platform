// INTERFACE/institution.ts
export interface InstitutionDataType {
  id: number;

  // ✅ FIX: Make old properties optional (?) so they are not required
  name?: string;
  image?: string | null;
  location?: string;

  // New Backend Properties
  instituteName?: string;
  instituteLocation?: string;
  instituteImage?: string | null;
}
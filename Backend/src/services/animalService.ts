import Animal, { IAnimal } from "../models/Animal";

export const getAllAnimals = async (): Promise<IAnimal[]> => {
  return Animal.find();
};

export const getAnimalById = async (id: string): Promise<IAnimal | null> => {
  return Animal.findById(id);
};

export const updateAnimalLocation = async (
  id: string,
  latitude: number,
  longitude: number
): Promise<IAnimal | null> => {
  return Animal.findByIdAndUpdate(
    id,
    {
      location: { latitude, longitude },
      lastSignal: new Date(),
    },
    { new: true }
  );
};

export const setAnimalRiskZoneStatus = async (
  id: string,
  isInsideRiskZone: boolean
): Promise<IAnimal | null> => {
  return Animal.findByIdAndUpdate(id, { isInsideRiskZone }, { new: true });
};

export const setCollarStatus = async (
  id: string,
  collarStatus: "Active" | "Signal Lost" | "Inactive"
): Promise<IAnimal | null> => {
  return Animal.findByIdAndUpdate(id, { collarStatus }, { new: true });
};

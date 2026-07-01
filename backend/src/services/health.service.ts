import { getHealthFromRepo } from "../repositories/health.repository";

export const getHealthStatus = () => {
  return getHealthFromRepo();
};
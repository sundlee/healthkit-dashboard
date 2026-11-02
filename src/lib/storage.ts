import { del, get, set } from "idb-keyval";
import type { Dataset } from "./types";

const KEY = "healthkit-dataset-v1";

export const loadDataset = () => get<Dataset>(KEY);
export const saveDataset = (d: Dataset) => set(KEY, d);
export const clearDataset = () => del(KEY);

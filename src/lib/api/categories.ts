import { api } from './client'
import type { Category, CategoryType } from '@/types/api'

export interface CreateCategoryDto {
  name: string
  type: CategoryType
  icon?: string
  color?: string
  parent_category_id?: string
}

export interface UpdateCategoryDto {
  name?: string
  icon?: string
  color?: string
}

export const categoriesApi = {
  list: (type?: CategoryType) =>
    api.get<Category[]>(`/categories${type ? `?type=${type}` : ''}`),

  get: (id: string) =>
    api.get<Category>(`/categories/${id}`),

  create: (dto: CreateCategoryDto) =>
    api.post<Category>('/categories', dto),

  update: (id: string, dto: UpdateCategoryDto) =>
    api.patch<Category>(`/categories/${id}`, dto),

  activate: (id: string) =>
    api.post<Category>(`/categories/${id}/activate`),

  deactivate: (id: string) =>
    api.post<Category>(`/categories/${id}/deactivate`),

  delete: (id: string) =>
    api.delete<void>(`/categories/${id}`),
}

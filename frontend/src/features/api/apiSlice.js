import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['SectionState', 'Conflicts', 'Recommendations', 'Audit'],
  endpoints: (builder) => ({
    // 1. Digital Twin Section State
    getSectionState: builder.query({
      query: (sectionId = 'default') => `/section/${sectionId}/state`,
      providesTags: ['SectionState'],
    }),

    // 2. Active OPEN Conflicts
    getConflicts: builder.query({
      query: (sectionId = 'default') => `/section/${sectionId}/conflicts`,
      providesTags: ['Conflicts'],
    }),

    // 3. Ranked Recommendations for Conflict
    getRecommendations: builder.query({
      query: (conflictId) => `/conflicts/${conflictId}/recommendations`,
      providesTags: (result, error, conflictId) => [
        { type: 'Recommendations', id: conflictId },
        'Recommendations',
      ],
    }),

    // 4. Record Controller Decision (Accept, Override, Modify)
    postDecision: builder.mutation({
      query: ({ recId, ...body }) => ({
        url: `/recommendations/${recId}/decision`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conflicts', 'Recommendations', 'Audit', 'SectionState'],
    }),

    // 5. What-If Simulation Projection
    postSimulate: builder.mutation({
      query: ({ sectionId = 'default', ...body }) => ({
        url: `/section/${sectionId}/simulate`,
        method: 'POST',
        body,
      }),
    }),

    // 6. Controller Decision Audit History
    getAudit: builder.query({
      query: (sectionId = 'default') => `/section/${sectionId}/audit`,
      providesTags: ['Audit'],
    }),

    // 7. Scenario Reset
    postScenario: builder.mutation({
      query: (body = { seed: 42 }) => ({
        url: '/scenarios',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SectionState', 'Conflicts', 'Recommendations', 'Audit'],
    }),

    // 8. Authentication Endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    getMe: builder.query({
      query: () => '/auth/me',
    }),
  }),
});

export const {
  useGetSectionStateQuery,
  useGetConflictsQuery,
  useGetRecommendationsQuery,
  usePostDecisionMutation,
  usePostSimulateMutation,
  useGetAuditQuery,
  usePostScenarioMutation,
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
} = apiSlice;


import { NextRequest, NextResponse } from 'next/server'
import { getPlanDraft, setPlanDraft, listPlanDrafts, deletePlanDraft } from '@/lib/redis/client'
import type { TrainingPlan } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const plan = await getPlanDraft(id)
      return NextResponse.json(plan)
    }

    const plans = await listPlanDrafts()
    return NextResponse.json(plans)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const plan: TrainingPlan = await req.json()
    if (!plan.id) return NextResponse.json({ error: 'plan.id required' }, { status: 400 })
    await setPlanDraft(plan.id, plan)
    return NextResponse.json(plan, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deletePlanDraft(id)
    return NextResponse.json({ deleted: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

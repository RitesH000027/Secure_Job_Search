"""
Global search endpoints for people, companies, and jobs.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.user import User, Profile
from app.models.networking import Company, JobPosting
from app.schemas.networking import GlobalSearchResult


router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=list[GlobalSearchResult])
async def global_search(
	query: str = Query("", min_length=1, max_length=100),
	limit: int = Query(20, ge=1, le=50),
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	search_term = query.strip()
	if not search_term:
		return []

	like_query = f"%{search_term}%"
	results: list[GlobalSearchResult] = []

	users = (
		db.query(User)
		.filter(User.id != current_user.id)
		.filter(or_(User.full_name.ilike(like_query), User.email.ilike(like_query)))
		.order_by(User.full_name.asc())
		.limit(limit)
		.all()
	)
	if users:
		profile_map = {profile.user_id: profile for profile in db.query(Profile).filter(Profile.user_id.in_([user.id for user in users])).all()}
		for user in users:
			profile = profile_map.get(user.id)
			results.append(
				GlobalSearchResult(
					result_type="person",
					id=user.id,
					title=user.full_name or user.email,
					subtitle=user.role.value,
					description=profile.headline if profile and profile.headline else None,
					url=f"/messages?user={user.id}",
				)
			)

	companies = (
		db.query(Company)
		.filter(
			or_(
				Company.name.ilike(like_query),
				Company.location.ilike(like_query),
				Company.description.ilike(like_query),
			)
		)
		.order_by(Company.created_at.desc())
		.limit(limit)
		.all()
	)
	for company in companies:
		results.append(
			GlobalSearchResult(
				result_type="company",
				id=company.id,
				title=company.name,
				subtitle=company.location or "Company",
				description=company.description,
				url=f"/companies/{company.id}/jobs",
			)
		)

	jobs = (
		db.query(JobPosting)
		.join(Company, Company.id == JobPosting.company_id)
		.filter(
			or_(
				JobPosting.title.ilike(like_query),
				JobPosting.description.ilike(like_query),
				Company.name.ilike(like_query),
				JobPosting.location.ilike(like_query),
				JobPosting.required_skills.ilike(like_query),
			)
		)
		.order_by(JobPosting.created_at.desc())
		.limit(limit)
		.all()
	)
	for job in jobs:
		results.append(
			GlobalSearchResult(
				result_type="job",
				id=job.id,
				title=job.title,
				subtitle=job.company.name,
				description=job.location or job.employment_type.value,
				url=f"/companies/{job.company_id}/jobs",
			)
		)

	return results[:limit]
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime, timezone

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(80), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    roadmaps = relationship('Roadmap', back_populates='user', cascade='all, delete-orphan')

class Roadmap(Base):
    __tablename__ = 'roadmaps'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    goal = Column(String(500), nullable=False)
    time_available = Column(String(100), nullable=False)
    current_level = Column(String(100), nullable=False)
    structure = Column(JSON, nullable=False)
    progress = Column(Integer, default=0)
    total_items = Column(Integer, default=0)
    notification_time = Column(String(10))
    notification_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='roadmaps')
    completed_items = relationship('CompletedItem', back_populates='roadmap', cascade='all, delete-orphan')

class CompletedItem(Base):
    __tablename__ = 'completed_items'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    roadmap_id = Column(String(36), ForeignKey('roadmaps.id', ondelete='CASCADE'), index=True)
    item_id = Column(String(255), nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    roadmap = relationship('Roadmap', back_populates='completed_items')
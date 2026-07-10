from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(100), nullable=False)
    real_name = Column(String(50))
    role = Column(String(20), nullable=False, default="doctor")
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    consultations = relationship("Consultation", back_populates="doctor")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    gender = Column(String(10))
    age = Column(Integer)
    phone = Column(String(20))
    address = Column(String(255))
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    medical_history = Column(Text)
    allergy_history = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    consultations = relationship(
        "Consultation",
        back_populates="patient",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    doctor = relationship("User")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    chief_complaint = Column(Text)
    symptoms = Column(Text)
    present_illness = Column(Text)
    past_history = Column(Text)
    examination = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("User", back_populates="consultations")
    ai_report = relationship(
        "AiReport",
        back_populates="consultation",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class AiReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id", ondelete="CASCADE"),
        nullable=False,
    )
    possible_diseases = Column(Text)
    suggested_checks = Column(Text)
    treatment_advice = Column(Text)
    risk_warning = Column(Text)
    full_report = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    consultation = relationship("Consultation", back_populates="ai_report")


class MessageConversation(Base):
    __tablename__ = "message_conversations"
    __table_args__ = (UniqueConstraint("user_one_id", "user_two_id", name="uq_message_conversation_users"),)

    id = Column(Integer, primary_key=True, index=True)
    user_one_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_two_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user_one = relationship("User", foreign_keys=[user_one_id])
    user_two = relationship("User", foreign_keys=[user_two_id])
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Message.created_at.asc()",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("message_conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    conversation = relationship("MessageConversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    username = Column(String(50))
    role = Column(String(20))
    action = Column(String(30), nullable=False)
    module = Column(String(50), nullable=False)
    target_type = Column(String(50))
    target_id = Column(String(50))
    detail = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User")

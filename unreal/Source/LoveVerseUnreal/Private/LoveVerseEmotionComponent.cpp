#include "LoveVerseEmotionComponent.h"

#include "Net/UnrealNetwork.h"

ULoveVerseEmotionComponent::ULoveVerseEmotionComponent()
{
    SetIsReplicatedByDefault(true);
}

void ULoveVerseEmotionComponent::SetExpression(ELVFacialExpression NewExpression)
{
    if (GetOwner() && GetOwner()->HasAuthority())
    {
        ApplyExpression(NewExpression);
        return;
    }
    ServerSetExpression(NewExpression);
}

void ULoveVerseEmotionComponent::ServerSetExpression_Implementation(ELVFacialExpression NewExpression)
{
    ApplyExpression(NewExpression);
}

void ULoveVerseEmotionComponent::ApplyExpression(ELVFacialExpression NewExpression)
{
    Expression = NewExpression;
    OnRep_Expression();
}

void ULoveVerseEmotionComponent::OnRep_Expression()
{
    OnExpressionChanged.Broadcast(Expression);
}

void ULoveVerseEmotionComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ULoveVerseEmotionComponent, Expression);
}
